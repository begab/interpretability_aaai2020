import argparse
import os
import pickle
import sys
sys.path.append('../')
import src.utils as utils
import scipy.sparse as sp
from collections import defaultdict, OrderedDict

def concept_frequency(cnet_file):
    """
    Count frequency of concepts.
    :return:
    concept_freq: dict containing the frequency of every concept from ConceptNet
    """
    concept_freq = defaultdict(int)
    for line in cnet_file:
        parts = line.decode("utf-8").strip().split("\t")
        concept = parts[1]
        concept_freq[concept] += 1
    cnet_file.seek(0)
    return concept_freq

class ConceptMatrix(object):
    def __init__(self, embedding_path, concept_path, rel, thd, language, longname):
        self.thd = thd
        self.longname = longname
        self.with_rel = rel
        self.no_random_embedding_name, self.embedding_name, self.concept_name, self.random = self.format_name(embedding_path, concept_path)
        # print(self.no_random_embedding_name, self.embedding_name, self.concept_name, self.random1, sep="\n")
        self.i2c, self.c2i, self.i2w, self.w2i, self.word_concept_dict =  self.load_files()

    def rel2text(self):
        if self.with_rel:
            return "_with_rel"
        return ""

    def format_name(self, embedding_path, concept_path):
        embedding_name = ".".join( (os.path.basename(embedding_path).strip().split("."))[0:-1] )
        if embedding_name.find("_f_") != -1:
            concept_name = (embedding_name.strip().split("_f_"))[-1] + self.rel2text() + "_t" + str(self.thd)
        else:
            concept_name = (os.path.basename(concept_path).strip().split("_assertions"))[0] + self.rel2text() + "_t" + str(self.thd)
        random = False
        if embedding_name.find("random1")!=-1:
            random=True
        no_random_embedding_name = embedding_name
        if random:
            paths = os.path.split(embedding_path)
            base = (((paths[1].strip().split("_random"))[0]).split(".npz"))[0]
            no_random_embedding_name = base
        return no_random_embedding_name, embedding_name, concept_name, random

    def load_files(self):
        i2c = pickle.load( open(('../data/indexing/concept/'+ self.concept_name + "_i2c.p"), 'rb') )
        c2i = pickle.load( open('../data/indexing/concept/'+ self.concept_name + "_c2i.p", 'rb') )
        i2w = pickle.load( open('../data/indexing/words/embeddings/'+ self.no_random_embedding_name + "_i2w.p", 'rb') )
        w2i = pickle.load( open('../data/indexing/words/embeddings/' + self.no_random_embedding_name + "_w2i.p", 'rb') )
        word_concept_dict = pickle.load( open(('../data/word_concept_dict/'+ self.concept_name + "_word_concept_dict.p"), 'rb') )
        return i2c, c2i, i2w, w2i, word_concept_dict

    def make(self):
        """
            Compute concept matrix whose rows correspond to words and its columns represent concepts.
            Alphabetical order is used for concepts.
            Ascending order is used for index2word dictionary
            to keep the order of words in concept matrix (the same as the word embedding matrix).
            Returns
            -------
            C : concept matrix
        """
        concepts = list(self.c2i.keys())
        data, indices, indptr = [], [], [0]
        print("\tNumber of words: ", len(self.i2w.keys()))
        print("\tNumber of concepts: ", len(self.i2c.keys()))
        ordered_i2w = OrderedDict(sorted(self.i2w.items(), key=lambda t: t[0]))
        for (i, w) in ordered_i2w.items(): #self.i2w.items():
            word_parts = w.strip().split(":")
            word = word_parts[-1]

            concept_list = self.word_concept_dict.get(word, [])
            concept_list = sorted(concept_list)
            # ind_list = [concepts.index(c) for c in concepts if c in concept_list]
            ind_list = [self.c2i[c] for c in concept_list]

            for ind in ind_list:
                data.append(float(1.0))
                indices.append(ind)
            indptr.append(len(indices))

        C = sp.csr_matrix((data, indices, indptr)
                          , shape=(len(indptr)-1, len(concepts)))
        print("C shape: ", C.shape, len(self.i2w))
        self.save(C)
        return C

    def save(self, mtx):
        addon = ""
        if self.random:
            addon = "random1/"
        if self.longname:
            mtx_name = os.path.join(("../data/sparse_matrices/word_concept/"+addon), self.embedding_name, self.concept_name,
                                  (self.embedding_name + "_" + self.concept_name + "_word_concept_mtx.npz"))
        else:
            mtx_name = os.path.join(("../data/sparse_matrices/word_concept/" + addon), self.embedding_name,
                                    self.concept_name,
                                    ("word_concept_mtx.npz"))
        utils.save_npz(mtx_name, mtx)

def main():
    parser = argparse.ArgumentParser(description='Process some integers.')
    parser.add_argument('--embedding', required=True, type=str, help='Path to npz format sparse matrix')
    parser.add_argument('--assertions', required=False, type=str, help='Path to json assertion file. Only used if emnedding is not filtered already.')
    parser.add_argument('--language', required=False, type=str, default='en', help='Language of conceptnet and sparse matrix files. Default: en')
    parser.add_argument('--relations', required=False, type=bool, default=False, help='True if concepts are augmented with relations. Default: False')
    parser.add_argument('--thd', required=False, type=str, default="-1", help='Threshold of concepts of the previously preprocessed assertion file.')
    parser.add_argument('--longname', required=False, type=bool, default=False, help='True if longer name should be used during saving, which is not recommended. Default: False')

    args = parser.parse_args()
    print("Command line arguments were ", args)

    if args.thd != "-1":
        print("Computing matrix with settings: thd: ", args.thd, " rel: no rel")
        cm = ConceptMatrix(args.embedding, args.assertions, args.relations, args.thd, args.language, args.longname)
        cm.make()

    else:
        thd_list = ["0", "5", "10", "20", "30", "40"]
        for thd in thd_list:
            print("Computing matrix with settings: thd: ", thd, " rel: no rel")
            cm = ConceptMatrix(args.sparse_matrix, args.assertions, args.relations, thd, args.language, args.longname)
            cm.make()
            # print("Computing matrix with settings: thd: ", thd, " rel: with rel")
            # cm = ConceptMatrix(args.sparse_matrix, args.assertions, True, thd, args.language, args.longname)
            # cm.make()

if __name__ == "__main__":
     main()