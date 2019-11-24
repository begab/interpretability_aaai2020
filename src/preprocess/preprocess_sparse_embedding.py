import gzip
import argparse
import os
import numpy as np
import scipy.sparse.linalg
import scipy.sparse as sp
import pickle
from collections import defaultdict, OrderedDict
sys.path.append('../../')
import src.utils as utils

class SparseEmbedding(object):
    """
    This class provides utils for efficient storage and manipulation of sparse (embedding) matrices.
    Objects are assumed to be located in the rows.
    """
    
    def __init__(self, embedding_path, matrix_name=None, languages=None, filter_rows=-1):
        if matrix_name == None:
            matrix_name = os.path.basename(embedding_path)
            print(matrix_name)
        self.w2i, self.i2w, self.W =  self.load_embeddings(embedding_path, matrix_name, languages=languages)

    def load_embeddings(self, path, mtx_name, languages=None, filter_rows=-1):
        """
        Reads in the sparse embedding file.
        Parameters
        ----------
        path : location of the gzipped sparse embedding file
        languages : a set containing the languages to filter for. 
        If None, no filtering takes plce.
        filter_rows : indicates the number of lines to read in.
        If negative, the entire file gets processed.
        Returns
        -------
        w2i : wordform to identifier dictionary
        i2w : identifier to wordform dictionary
        W : the sparse embedding matrix
        """

        if type(languages) == str:
            languages = set([languages])
        elif type(languages) == list:
            languages = set(languages)

        i2w = OrderedDict()
        data, indices, indptr = [], [], [0]
        with gzip.open(path, 'rb') as f:
            for line_number, line in enumerate(f):
                if line_number == filter_rows:
                    break
                parts = line.decode("utf-8").strip().split()
                # print(line)
                language = parts[0][0:2]
                if languages is not None and language not in languages:
                    continue
                # if (parts[0].strip().split(":"))[-1]=='1':
                #     print((parts[0].strip().split(":"))[-1])
                #     print(line)
                i2w[len(i2w)] = parts[0].strip() #(parts[0].strip().split(":"))[-1] # leave out language
                for i, value in enumerate(parts[1:]):
                    value = float(value)
                    if value != 0:
                        data.append(float(value))
                        indices.append(i)
                indptr.append(len(indices))


        i2w = OrderedDict(i2w.items(), key=lambda t: int(t[0]))
        del i2w["key"]
        w2i = {w: i for i, w in i2w.items()}
        W = sp.csr_matrix((data, indices, indptr), shape=(len(indptr)-1, i+1))
        frequency_ranking = list(i2w.values())

        # save sparse matrix
        mtx_path_name = os.path.join("../data/sparse_matrices/word_base/embeddings/", mtx_name)
        utils.save_npz(mtx_path_name,W)

        # save w2i, i2w
        w2i_name = "../data/indexing/words/embeddings/" + mtx_name + "_w2i.p"
        i2w_name = "../data/indexing/words/embeddings/" + mtx_name + "_i2w.p"
        frequency_name = "../data/word_frequency/" + mtx_name + "_frequency.p"
        utils.pickler(w2i_name, w2i)
        utils.pickler(i2w_name, i2w)
        utils.pickler(frequency_name, frequency_ranking)
        return w2i, i2w, W

    def get_embedding(self, word, language=''):
        query_word = '{}{}{}'.format(language, '' if len(language)==0 else ':', word)
        return self.W.getrow(self.w2i[query_word])

    def calculate_cooccurrence(self, argument=None):
        """
        Calculates the cooccurrences of observations using matrix multiplication.
        Parameters
        ----------
        path : location of the gzipped sparse embedding file
        languages : a set containing the languages to filter for. 
        If None, no filtering takes plce.
        filter_rows : indicates the number of lines to read in.
        If negative, the entire file gets processed.
        Returns
        -------
        w2i : wordform to identifier dictionary
        i2w : identifier to wordform dictionary
        W : the sparse embedding matrix
        """    
        self.W, W_data_copy = self.binarize_data(self.W)

        if argument is None:
            argument = self.W

        argument, argument_data_copy = self.binarize_data(argument)

        cooccurrences = self.W.T @ argument

        self.revert_data(self.W, W_data_copy)
        self.revert_data(argument, argument_data_copy)
        return cooccurrences

    def binarize_data(self, X):
        """
        Performs binarization of the data entries only if necessary.
        Also return the original values, so that reverting the entries is possible.
        """
        X_data_copy = None
        if np.any(X.data!=1.0):
            X_data_copy = X.data
            X.data = np.ones(X_data_copy.shape)
        return X, X_data_copy

    def revert_data(self, X, X_original_data):
        if X_original_data is not None:
            X.data = X_original_data
        

    def calculate_PMI(self, argument=None):
        self.W, W_data_copy = self.binarize_data(self.W)
        if argument is None:
            argument = self.W

        argument, argument_data_copy = self.binarize_data(argument)
        
        cooccurrences = self.calculate_cooccurrence(argument)
        fs = self.W.sum(axis=0)
        denom = fs.T @ fs
        pmi = np.log((self.W.shape[0]*cooccurrences)/denom)
        pmi[pmi == -np.inf] = 0
        #pmi -= np.diag(pmi)*np.eye(pmi.shape[0]) # remove self-loops
        self.revert_data(self.W, W_data_copy)
        self.revert_data(argument, argument_data_copy)
        return pmi

    def calculate_PPMI(self, argument=None):
        ppmi = self.calculate_PMI(argument)
        ppmi[ppmi < 0] = 0
        return ppmi

"""
TODO
    def project_network(self, p_value_threshold):
        self.W, W_data_copy = self.binarize_data(self.W)
        nonzeroes = self.W.indptr[1:] - self.W.indptr[0:-1] #number of nonzero coefficients per word
        data, indices, indptr = [], [], [0]
        batch_size = 100
        for i in range(self.W.shape[0] // batch_size):
            R = (self.W[i*batch_size:(i+1)*batch_size] @ self.W.T).tocoo()
            for r, c, overlap in zip(R.row, R.col, R.data):
                p_val = hypergeom(self.W.shape[1], nonzeroes[r], nonzeroes[c]).cdf(overlap-1)
                if p_val > 0.999:
                    print(r, c, overlap, p_val,nonzeroes[r], nonzeroes[c])
                if p_val > p_value_threshold:
                    data.append(p_val)
                    indices.append(c)
            indptr.append(len(data))
        adjacency = sp.csr_matrix((data, indices, indptr), shape=(len(indptr)-1, i+1))
        self.W.data = W_data # reset the float weights
        return adjacency
"""

def main():
    parser = argparse.ArgumentParser(description='Process some integers.')
    parser.add_argument('--embedding', required=True, type=str)
    parser.add_argument('--matrix-name', required=False, type=str)
    parser.add_argument('--language', required=False, default=None, nargs='*', type=str)
    # parser.add_argument('--vocabulary', required=False, default='../data/vocabulary/microsoft_concept_graph_w_10.json_vocabulary.p', type=str)
    args = parser.parse_args()
    print("The command line arguments were ", args)
    se = SparseEmbedding(args.embedding_location, args.matrix_name, args.language)

    print('{} words read in...'.format(se.W.shape[0]))
    # query = ('en', 'dog')
    # nonzero_indices_of_query = se.get_embedding(query[1], query[0])
    # print('Word {} has non-zero coefficients for concepts {}'.format(':'.join(query), nonzero_indices_of_query.indices))
    #
    # ppmi = se.calculate_PPMI()
    # print("A sample from the PPMI matrix: ", ppmi[0:5, 0:5])

if __name__ == "__main__":
    main()
