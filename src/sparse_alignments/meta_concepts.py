import argparse
import os
import numpy as np
import pickle
import sys
sys.path.append('../')
import src.utils as utils
import copy
import scipy.sparse as sp
from collections import defaultdict


class CloseConcepts(object):
    def __init__(self, concept_path):
        self.concept_name = self.format_name(concept_path)
        self.C = self.load_files(concept_path)
        self.i2c, self.c2i, self.word_concept_dict = self.load_indices()

    def format_name(self, concept_path):
        dir_name = os.path.dirname(concept_path)
        concept_name = (dir_name.strip().split('/'))[-1]
        # concept_name = '_'.join((concept_name.split('_'))[0:-1])
        print(concept_name)
        return concept_name

    def load_files(self, concept_path):
        C = sp.load_npz(concept_path)
        return C

    def load_indices(self):
        i2c = pickle.load(open(('../data/indexing/concept/' + self.concept_name + "_i2c.p"), 'rb'))
        c2i = pickle.load(open('../data/indexing/concept/' + self.concept_name + "_c2i.p", 'rb'))
        word_concept_dict = pickle.load(open(('../data/word_concept_dict/' + self.concept_name + "_word_concept_dict.p"), 'rb'))
        return i2c, c2i, word_concept_dict

    def calculate_cooccurrence(self):
        CC = self.C.T * self.C
        print("Cooccurence shape: ", CC.shape)
        return CC

    def calculate_NPPMI(self):
        cooccurrences = self.calculate_cooccurrence()
        fs = self.C.sum(axis=0)
        denom = fs.T @ fs
        pmi = sp.csc_matrix( (self.C.shape[0] * cooccurrences) / denom )
        pmi.data = np.log(pmi.data)
        prod = sp.csc_matrix(cooccurrences / float(self.C.shape[0]))
        prod.data = 1 / - np.log(prod.data)
        nppmi = pmi.multiply(prod)
        nppmi.data = np.nan_to_num(nppmi.data)
        nppmi[nppmi < 0.0 ] = 0.0
        sub = nppmi.diagonal()*np.eye(nppmi.shape[0])
        nppmi = nppmi - sub
        nppmi = sp.csc_matrix(nppmi)
        print("NPPMI shape:", nppmi.shape)
        return nppmi

    def copy_close_concepts(self):
        copyC = sp.lil_matrix(copy.deepcopy(self.C))
        print("Sparsity: ", copyC.getnnz() / (copyC.shape[0] * copyC.shape[1]))
        nppmi = self.calculate_NPPMI()
        close_concepts_dict = defaultdict(set)
        max_values = np.amax(nppmi, axis=0).todense()
        for i in range(nppmi.shape[0]):
            concept = self.i2c[i]
            column = (nppmi.getcol(i).toarray().T)[0, :]
            max_value = max_values[0, i]
            close_concepts = []
            if max_value > 0.5:
                close_concepts = [self.i2c[ind] for ind, value in enumerate(column) if value >= 0.95 * max_value]
            close_concepts_dict[concept] = set(close_concepts)

            # if max_value > 0.7:
            #     print(concept, max_value, close_concepts, "\n")

        out_dict = "../results/close_concepts/dict/" + self.concept_name + ".p"
        utils.pickler(out_dict, close_concepts_dict)


def main():
    parser = argparse.ArgumentParser(description='Process some integers.')
    parser.add_argument('--word-concept', required=True, type=str, help='Path to npz word concept matrix.')

    args = parser.parse_args()
    print("Command line arguments were ", args)
    c = CloseConcepts(args.word_concept)
    c.copy_close_concepts()

if __name__ == "__main__":
     main()