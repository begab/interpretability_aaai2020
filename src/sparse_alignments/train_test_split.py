import argparse
import os
import copy
import pickle
import numpy as np
import random as rd
import scipy.sparse as sp
from collections import defaultdict
import sys
sys.path.append('../')
import src.utils as utils

TRAIN = 0.6
TEST = 1.0 - TRAIN
DIR = "../data/sparse_matrices/word_concept/splitted/"

class Splitter(object):
    def __init__(self, embedding_path, thd, rel):
        self.rel = rel
        self.thd = thd
        self.embedding_name = ".".join((os.path.basename(embedding_path).strip().split("."))[0:-1])
        print("EMBEDDING: ", self.embedding_name)
        assert self.embedding_name.find("_f_") != -1
        self.concept_name = (self.embedding_name.strip().split("_f_"))[-1] + self.rel2text() + "_t" + str(self.thd)
        self.i2c, self.c2i, self.i2w, self.w2i, self.word_concept_dict = self.load_indices()
        self.E, self.C = self.load_matrices(embedding_path)

    def rel2text(self):
        if self.rel:
            return "_with_rel"
        return ""

    def load_matrices(self, embedding_path):
        E = sp.load_npz(embedding_path)
        mtx_name = os.path.join(("../data/sparse_matrices/word_concept/"), self.embedding_name,
                                self.concept_name,
                                ("word_concept_mtx.npz"))
        # E = normalize(E, norm='l2', axis=1)
        C = sp.load_npz(mtx_name)
        # C = normalize(C, norm='l2', axis=1)
        return E, C

    def load_indices(self):
        i2c = pickle.load(open(('../data/indexing/concept/' + self.concept_name + "_i2c.p"), 'rb'))
        c2i = pickle.load(open('../data/indexing/concept/' + self.concept_name + "_c2i.p", 'rb'))
        i2w = pickle.load(open('../data/indexing/words/embeddings/' + self.embedding_name + "_i2w.p", 'rb'))
        w2i = pickle.load(open('../data/indexing/words/embeddings/' + self.embedding_name + "_w2i.p", 'rb'))
        word_concept_dict = pickle.load(
            open(('../data/word_concept_dict/' + self.concept_name + "_word_concept_dict.p"), 'rb'))
        return i2c, c2i, i2w, w2i, word_concept_dict

    def split(self):
        new_C = copy.deepcopy(self.C)
        test_size = defaultdict()
        avg_test_size = 0.0
        denom = int(self.C.shape[1])
        for i in range(self.C.shape[1]):
            col = enumerate( ((self.C.getcol(i)).toarray().T)[0, :] )
            nonzero_ind = [ind for (ind, value) in col if value > 0]
            rd.shuffle(nonzero_ind)
            train_size = int(np.ceil(TRAIN * len(nonzero_ind)))
            train_ind, test_ind = nonzero_ind[:train_size], nonzero_ind[train_size:]
            test_size[i] = (len(test_ind), test_ind)
            if train_size>0:
                avg_test_size += len(test_ind)
            else:
                denom -= 1
            for j in test_ind:
                new_C[j, i] = 0.0
        print('Average test size: ', avg_test_size/denom)
        print(new_C.shape)
        self.save_C(new_C, test_size)
        return test_size, new_C

    def save_C(self, new_C, test_size):
        name_test = os.path.join(DIR, "test_size", self.embedding_name, self.concept_name, "test_size.npz")
        name_C = os.path.join(DIR, self.embedding_name, self.concept_name, "word_concept_mtx.npz")
        utils.save_npz(name_C, new_C)
        utils.pickler(name_test, test_size)



def main():
    parser = argparse.ArgumentParser(description='Process some integers.')
    parser.add_argument('--embedding', required=False, type=str,
                        default='../data/sparse_matrices/word_base/embeddings/filtered/glove300d_l_0.5_DL_top400000.emb.gz_f_conceptnet56_v_CONCS_FEATS_concstats_brm.txt_np.npz', help='Path to ConceptNet csv.')
    parser.add_argument('--thd', required=False, type=int, default=-1, help='Threshold for concepts of previously preprocessed assertions.')
    parser.add_argument('--rel', required=False, type=bool, default=False, help='Existence of relations. Default: False')

    args = parser.parse_args()
    print("The command line arguments were ", args)

    if args.thd != -1:
        sp = Splitter(args.embedding, args.thd, args.rel)
        sp.split()
    else:
        for thd in [40, 30, 20, 10, 5, 0]:
            sp = Splitter(args.embedding, thd, args.rel)
            sp.split()



if __name__ == "__main__":
    main()