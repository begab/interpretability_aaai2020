import argparse
import os
import numpy as np
import scipy.sparse as sp
import pickle
import sys
sys.path.append('../')
import src.utils as utils

FREQUENCY_LIMIT = 400000
class Embedding(object):
    def __init__(self, embedding_path):
        self.embedding_name = ".".join( (os.path.basename(embedding_path).strip().split("."))[0:-1] )
        self.E, self.i2w, self.w2i, self.word_order = self.load(embedding_path)

    def load(self, embedding_path):
        i2w = pickle.load(open('../data/indexing/words/embeddings/' + self.embedding_name + "_i2w.p", 'rb'))
        w2i = pickle.load(open('../data/indexing/words/embeddings/' + self.embedding_name + "_w2i.p", 'rb'))
        E = sp.load_npz(embedding_path)
        word_order = pickle.load(open('../data/word_frequency/' + self.embedding_name + '_frequency.p',  'rb'))
        return E, i2w, w2i, word_order

    def filter(self, vocabulary, name, animals=None):
        row_list = []
        word_list = []
        print('vocab size: ', len(vocabulary))
        if animals != None:
            vocab_set = set(vocabulary).intersection(set(animals))
            vocabulary =  list(vocab_set)
            print("size of intersection: ", len(vocabulary))
        for word in vocabulary:
            w = word.strip()
            ind = self.w2i.get(w, None)
            if ind != None:
                row_list.append(ind)
                word_list.append(word)

        row_list = sorted(row_list)
        F = sp.csr_matrix(self.E[row_list, :])
        w2i = {self.i2w[original_ind]: new_ind for (new_ind, original_ind) in enumerate(row_list)}
        i2w = {ind: word for (word, ind) in w2i.items()}
        local_freq_limit = np.min([FREQUENCY_LIMIT, len(i2w.keys())])
        F = sp.csr_matrix(F[0:local_freq_limit, :])
        i2w = {ind: word for (ind, word) in i2w.items() if ind < local_freq_limit}
        w2i = {word: ind for (ind, word) in i2w.items()}

        # print("Sparse matrix shape: ", F.shape, "\nIndices: ", len(i2w.keys()))
        index_name = "../data/indexing/words/embeddings/" + self.embedding_name + "_f_" + name
        npz_name = "../data/sparse_matrices/word_base/embeddings/filtered/" + self.embedding_name \
                   + "_f_" + name + ".npz"
        if animals != None:
            index_name = "../data/indexing/words/embeddings/animals_" + self.embedding_name + "_f_" + name
            npz_name = "../data/sparse_matrices/word_base/embeddings/filtered/animals_" + self.embedding_name \
                       + "_f_" + name + ".npz"
        utils.pickler((index_name + "_i2w.p"), i2w)
        utils.pickler((index_name + "_w2i.p"), w2i)
        utils.save_npz(npz_name, F)
        return F, i2w, w2i

def main():
        parser = argparse.ArgumentParser(description='Process some integers.')
        parser.add_argument('--embedding', required=True, type=str, help='Path to preprocessed sparse embedding.')
        parser.add_argument('--vocabulary', required=True, type=str, help='Path to pickled vocabulary file.')
        parser.add_argument('--animals', required=False,
                            default='../data/vocabulary/propagated_animals_conceptnet56_vocabulary.p', type=str)
        args = parser.parse_args()
        print("The command line arguments were ", args)

        se = Embedding(args.embedding)
        vocabulary = pickle.load(open(args.vocabulary, 'rb'))
        vocabulary_name = (os.path.basename(args.vocabulary).strip().split("_vocabulary"))[0]

        # animals = pickle.load(open(args.animals, 'rb'))
        print("Global filter running...")
        F = se.filter(vocabulary, vocabulary_name)


if __name__ == "__main__":
    main()