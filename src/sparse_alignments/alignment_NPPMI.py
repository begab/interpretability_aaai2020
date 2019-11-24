import argparse
import os
import numpy as np
import pickle
import sys
sys.path.append('../')
import src.utils as utils
import scipy.sparse as sp
from collections import defaultdict
from sklearn.preprocessing import normalize

def concept_frequency(concept_name):
    dict_path = "../data/word_concept_dict/" + concept_name + "_word_concept_dict.p"
    word_concept_dict = pickle.load(open(dict_path, 'rb'))
    concept_freq = defaultdict(int)
    for word, clist in word_concept_dict.items():
        for c in clist:
            concept_freq[c] += 1
    return concept_freq

def ban_concept(concept):
    banned_concepts = []  # ["Synonym", "RelatedTo", "IsA"]
    for c in banned_concepts:
        if concept.find(c) != -1:
            return True
    return False

class Concept2Base(object):
    def __init__(self, aligner):
        self.aligner = aligner
        freq_name_part = (self.aligner.embedding_name.strip().split("emb"))[0]
        freq_name_part = (freq_name_part.split("animals_"))[-1]
        frequency_name = os.path.join("../data/word_frequency", ( freq_name_part + "emb.gz_frequency.p"))
        self.frequency = pickle.load(open(frequency_name, "rb")) # TODO frequency

    def get_concept_base_pairs(self, one2one=True):
        """
        Associate a base to each concept based on the maximum ppmi value per concept.
        :return:
        c_max_base: dictionary for (concept: base) pairs
        """
        ppmi_name = os.path.join(("../results/nppmi/matrix/" + self.aligner.rand2text()), self.aligner.embedding_name, self.aligner.concept_name,
                                 ("nppmi_mtx.npz"))
        PPMI = sp.csr_matrix(sp.load_npz(ppmi_name))

        if one2one:
            c_max_base = {}
            max_bases = np.argmax(PPMI, axis=1)  # max concepts based on ppmi values
            none_number = 0
            for i in range(max_bases.shape[0]):
                # row = PPMI[i, :]
                row = (PPMI.getrow(i).toarray().T)[0, :]
                max_value = np.amax(row)
                j = max_bases[i, 0]
                c_name = self.aligner.i2c[i]
                b_ind = j
                c_max_base[c_name] = b_ind
                if max_value == 0.0:
                    none_number += 1
                    c_max_base[c_name] = "NONE"
            self.save_max_base(c_max_base, one2one)
        else:
            c_max_base = defaultdict(list)
            max_values = np.amax(PPMI, axis=1).todense()
            for i in range(PPMI.shape[0]):
                # row = sp.csc_matrix(PPMI[i, :]).reshape(PPMI.shape[1], 1)
                row = PPMI[i, :].todense().reshape(PPMI.shape[1], 1)
                max_value = max_values[i, 0]
                if max_value == 0.0:
                    c_max_base[self.aligner.i2c[i]] = []
                else:
                    base_inds = [ind for ind, value in enumerate(row) if value > 0.9 * max_value]
                    for base_ind in base_inds:
                        concept_name = self.aligner.i2c[i]
                        c_max_base[concept_name].append(base_ind)
            self.save_max_base(c_max_base, one2one)
        return c_max_base

    def save_max_base(self, mtx, one2one=True):
        addon = ""
        if not one2one:
            addon = "s"
        if self.aligner.longname:
            file_name = os.path.join(("../results/nppmi/max_base" + addon + "/" + self.aligner.rand2text()), self.aligner.embedding_name, self.aligner.concept_name,
                                     (
                                     "max_base_of_a_concept_" + self.aligner.embedding_name + "_" + self.aligner.concept_name + "_thd" + str(
                                         self.aligner.thd) + "_" + self.aligner.cont2text() + ".p"))
        else:
            file_name = os.path.join(("../results/nppmi/max_base" + addon + "/" + self.aligner.rand2text()), self.aligner.embedding_name, self.aligner.concept_name,
                                     ("max_base_of_a_concept.p"))
        utils.pickler(file_name, mtx)

    def sample_max_base(self, one2one=True):
        addon = ""
        if not one2one:
            addon = "s"
        c_max_base = self.get_concept_base_pairs()
        if self.aligner.longname:
            f_name = os.path.join(("../results/nppmi/max_base" + addon + "/" + self.aligner.rand2text()), self.aligner.embedding_name, self.aligner.concept_name,
                                     (
                                     "max_base_of_a_concept_" + self.aligner.embedding_name + "_" + self.aligner.concept_name + "_thd" + str(
                                         self.aligner.thd) + "_" + self.aligner.cont2text() + ".csv"))
        else:
            f_name = os.path.join(("../results/nppmi/max_base" + addon + "/" + self.aligner.rand2text()), self.aligner.embedding_name, self.aligner.concept_name,
                                     ("max_base_of_a_concept.csv"))

        words_dict = {}
        words_dict["NONE"] = ""
        for i in range(self.aligner.E.shape[1]):
            col = ((self.aligner.E.getcol(i)).toarray().T)[0, :]
            ind = np.argpartition(col, -20)[-20:]  # max 20 indices
            ind[np.argsort(col[ind])]
            words = [self.aligner.i2w[j] for j in ind]
            words = " ".join(words)
            words_dict[i] = words

        f = open(f_name, "w", encoding="utf-8")
        for concept, base in c_max_base.items():
            if str(base) != "NONE":
                out_text = concept + "\t" + str(base) + "\t" + words_dict[base] + "\n"
                f.write(out_text)
        f.close()

class Base2Concept(object):
    def __init__(self, aligner):
        self.aligner = aligner
        freq_name_part = (self.aligner.embedding_name.strip().split("emb"))[0]
        freq_name_part = (freq_name_part.split("animals_"))[-1]
        frequency_name = os.path.join("../data/word_frequency", ( freq_name_part + "emb.gz_frequency.p"))
        self.frequency = pickle.load(open(frequency_name, "rb")) # TODO frequency

    def save_max_order(self):
        ppmi_name = os.path.join(("../results/nppmi/matrix/" + self.aligner.rand2text()), self.aligner.embedding_name,
                                 self.aligner.concept_name,
                                 ("nppmi_mtx.npz"))
        PPMI = sp.load_npz(ppmi_name)
        PPMI = sp.csc_matrix(PPMI)
        max_args = np.argmax(PPMI, axis=0)
        out_vals = []
        for i in range(PPMI.shape[1]):
            max_ind = max_args[0, i]
            max_val = PPMI[max_ind, i]
            out_vals.append(max_val)
        sorted_out_vals = sorted(enumerate(out_vals), reverse=True, key=lambda e: float(e[1]))
        utils.pickler("../results/nppmi/order/" + self.aligner.embedding_name + "_base_order.p", sorted_out_vals)


    def get_base_concept_pairs(self, one2one=True, value_thd=0.0):
        """
        Associate a concept to each base based on the maximum ppmi value per base.
        :return:
        b_max_concept: dictionary for (base: concept) pairs
        """
        b_max_concepts = defaultdict(list)
        # PPMI = self.calculate_PPMI()
        ppmi_name = os.path.join(("../results/nppmi/matrix/" + self.aligner.rand2text()), self.aligner.embedding_name, self.aligner.concept_name,
                                 ("nppmi_mtx.npz"))
        PPMI = sp.load_npz(ppmi_name)
        PPMI = sp.csc_matrix(PPMI)
        close_concept_dict = pickle.load(open("../results/close_concepts/dict/"+self.aligner.concept_name+".p", "rb"))
        if one2one:
            max_cs = np.argmax(PPMI, axis=0)  # get max of each column ie base
            max_vals = []
            b_max_concept = {}
            for i in range(max_cs.shape[1]):
                # col = PPMI[:, i]
                col = (PPMI.getcol(i).toarray().T)[0, :]
                max_value = np.amax(col)
                max_vals.append(max_value)
                j = max_cs[0, i]
                c_name = self.aligner.i2c[j]
                # print('Base: ', i, ' concept: ', c_name, ' NPMI: ', max_value)
                b_ind = i
                # print(i, c_name)
                close_concepts = list(close_concept_dict[c_name])
                concept_names = list()
                concept_names.append(c_name)
                concept_names.extend(close_concepts)
                b_max_concept[b_ind] = concept_names
                if max_value <= value_thd:
                    b_max_concept[b_ind] = "NONE"

            b_max_concepts = b_max_concept
            self.save_max_concept(b_max_concepts, one2one)

        else:
            for i in range(PPMI.shape[1]):
                column = np.array((PPMI[:, i]).todense().T)[0] # PPMI[:, i]
                max_value = max(column)#max_values[0, i]
                part = 0.7*max_value
                if False: #max_value == 0.0:
                    b_max_concepts[i] = []
                else:
                    concept_inds = [self.aligner.i2c[ind] for ind, value in enumerate(column)
                                    if value >= part]# and value > value_thd]
                    b_max_concepts[i].extend(concept_inds)

            self.save_max_concept(b_max_concepts, one2one)
        return b_max_concepts

    def save_max_concept(self, mtx, one2one=True):
        addon = ""
        if not one2one:
            addon = "s"

        if self.aligner.longname:
            file_name = os.path.join(("../results/nppmi/max_concept" + addon + "/" + self.aligner.rand2text()), self.aligner.embedding_name,
                                     self.concept_name,
                                     (
                                     "max_concepts_of_base_" + self.aligner.embedding_name + "_" + self.aligner.concept_name + "_thd" + str(
                                         self.aligner.thd) + "_" + self.aligner.cont2text() + ".p"))
        else:
            file_name = os.path.join(("../results/nppmi/max_concept" + addon + "/" + self.aligner.rand2text()), self.aligner.embedding_name,
                                     self.aligner.concept_name,
                                     ("max_concepts_of_base.p"))
        utils.pickler(file_name, mtx)

    def sample_max_concept(self, one2one=True):
        b_max_concept = self.get_base_concept_pairs(one2one=one2one)
        addon = ""
        if not one2one:
            addon = "s"
        if self.aligner.longname:
            f_name = os.path.join(("../results/nppmi/max_concept" + addon + "/" + self.aligner.rand2text()), self.aligner.embedding_name,
                                     self.aligner.concept_name,
                                     (
                                     "max_concepts_of_base_" + self.aligner.embedding_name + "_" + self.aligner.concept_name + "_thd" + str(
                                         self.aligner.thd) + "_" + self.aligner.cont2text() + ".csv"))
        else:
            f_name = os.path.join(("../results/nppmi/max_concept" + addon + "/" + self.aligner.rand2text()), self.aligner.embedding_name,
                                     self.aligner.concept_name,
                                     ("max_concepts_of_base.csv"))
        f = open(f_name, "w", encoding="utf-8")
        close_concept_dict = pickle.load(open("../results/close_concepts/dict/"+self.aligner.concept_name+".p", "rb"))
        for i in range(self.aligner.E.shape[1]):
            col = ((self.aligner.E.getcol(i)).toarray().T)[0, :]
            nonzero = [(j, value) for (j, value) in enumerate(col) if value > 0]
            nonzero = sorted(nonzero, key=lambda t: float(t[1]), reverse=True)
            words = [self.aligner.i2w[ind] for ind, val in sorted(enumerate(col), reverse=True, key=lambda t: float(t[1])) if val > 0][0:10]

            words = "[ " + " ".join(words) + " ]"
            concepts = b_max_concept[i]
            if type(concepts) == type(list()):
                conceps_name = ", ".join(concepts)
            else:
                tmp = concepts
                concepts = list()
                concepts.append(tmp)
                close_concepts = list(close_concept_dict[tmp])
                concepts.extend(close_concepts)
                conceps_name = ", ".join(concepts)

            connected_to_concept = [self.aligner.i2w[i] for i, value in nonzero
                                    if len(set(concepts).intersection(set(self.aligner.word_concept_dict[self.aligner.i2w[i]]))) > 0 ]
            limit = np.min([len(connected_to_concept), len(words)])
            connected_to_concept = connected_to_concept[0:limit]
            connected_to_concept = "[ " + " ".join(connected_to_concept) + " ]"
            out_text = str(i) + "\t" + conceps_name + "\t" + words + "\t" + connected_to_concept + "\n"
            # print(out_text)
            f.write(out_text)
        f.close()

class Aligner(object):
    def __init__(self, embedding_path, concept_path, cont_sparse, thd, language, longname, rel):
        self.with_rel = rel
        self.longname = longname
        self.thd = thd
        self.cont_sparse = cont_sparse
        self.no_random_embedding_name, self.embedding_name, self.concept_name, self.random = self.format_name(
            embedding_path, concept_path)
        self.E, self.C = self.load_matrices(embedding_path, concept_path)
        print("init_parameters:\nembedding ", self.E.shape, "\nconcept ", self.C.shape)
        self.i2c, self.c2i, self.i2w, self.w2i, self.word_concept_dict = self.load_files()

    def rel2text(self):
        if self.with_rel:
            return "_with_rel"
        return ""

    def cont2text(self):
        if self.cont_sparse:
            return "continous"
        else:
            return "binary"

    def rand2text(self):
        if self.random:
            return "random1/"
        else:
            return ""

    def format_name(self, embedding_path, concept_path):
        embedding_name = ".".join((os.path.basename(embedding_path).strip().split("."))[0:-1])

        random = False
        no_random_embedding_name = embedding_name
        if embedding_path.find("random1") != -1:
            random = True
            no_random_embedding_name = embedding_name
        if random:
            paths = os.path.split(embedding_path)
            base = (((paths[1].strip().split("_random"))[0]).split(".npz"))[0]
            no_random_embedding_name = base

        if embedding_name.find("_f_") != -1:
            concept_name = (no_random_embedding_name.strip().split("_f_"))[-1] + self.rel2text() + "_t" + str(self.thd)
        else:
            concept_name = (os.path.basename(concept_path).strip().split("_assertions"))[0] + "_t" + str(self.thd)

        return no_random_embedding_name, embedding_name, concept_name, random

    def load_matrices(self, embedding_path, concept_path):
        E = sp.load_npz(embedding_path)
        mtx_name = os.path.join(("../data/sparse_matrices/word_concept/splitted/" ), self.no_random_embedding_name,
                                self.concept_name,
                                ("word_concept_mtx.npz"))

        E = normalize(E, norm='l2', axis=1)
        E = sp.csc_matrix(E)
        C = sp.load_npz(mtx_name)
        C = normalize(C, norm='l2', axis=1)
        return E, C

    def load_files(self):
        i2c = pickle.load(open(('../data/indexing/concept/' + self.concept_name + "_i2c.p"), 'rb'))
        c2i = pickle.load(open('../data/indexing/concept/' + self.concept_name + "_c2i.p", 'rb'))
        i2w = pickle.load(open('../data/indexing/words/embeddings/' + self.no_random_embedding_name + "_i2w.p", 'rb'))
        w2i = pickle.load(open('../data/indexing/words/embeddings/' + self.no_random_embedding_name + "_w2i.p", 'rb'))
        word_concept_dict = pickle.load(
            open(('../data/word_concept_dict/' + self.concept_name + "_word_concept_dict.p"), 'rb'))
        return i2c, c2i, i2w, w2i, word_concept_dict

    def preproc_C(self):
        C = sp.lil_matrix(self.C)
        concept_freq = concept_frequency(self.concept_name)
        for j in range(C.shape[1]):
            concept = self.i2c[j]
            if concept_freq[concept] < self.thd or ban_concept(concept):
                C[:, j] = 0.0
        return sp.csr_matrix(C)

    def product(self):
        """
                Compute the product of transposed concept matrix and sparse word embedding matrix,
                so that the result matrix has its rows represent concepts while its columns represent bases.
                :return:
                concept_base_mtx: product matrix
                """
        concept_word_mtx = self.C.transpose()
        word_base_binary = self.E
        if not self.cont_sparse:
            word_base_binary = (word_base_binary > 0).astype(np.int_)
            concept_word_mtx = (concept_word_mtx > 0).astype(np.int_)
        concept_base_mtx = concept_word_mtx * word_base_binary
        print("\nproduct: ", concept_base_mtx.shape)

        ret = concept_base_mtx  # self.postproc_product(concept_base_mtx)
        self.save_product(concept_base_mtx)
        return ret

    def postproc_product(self, mtx):
        # concept_freq = concept_frequency(self.concept_name)
        mtx = sp.lil_matrix(mtx)
        mtx[mtx < self.thd] = 0
        return sp.csr_matrix(mtx)

    def save_product(self, mtx):
        concept_base_mtx_name = os.path.join(("../data/sparse_matrices/concept_base/" + self.rand2text()),
                                             self.embedding_name, self.concept_name, str(self.thd),
                                             ("concept_base_mtx" + "_" + self.cont2text() + ".npz"))
        utils.save_npz(concept_base_mtx_name, mtx)

    def calculate_NPPMI(self):
        CB_matrix = self.product()
        CB_matrix = self.postproc_product(CB_matrix)

        WB_mtx = self.E
        WC_mtx = self.C

        WB_mtx = (WB_mtx > 0).astype(np.int_)
        WC_mtx = (WC_mtx > 0).astype(np.int_)

        cooccurrences = CB_matrix  # + np.ones(CB_matrix.shape)
        c_freq = WC_mtx.sum(axis=0) #np.eye(1, WC_mtx.sum(axis=0).shape[1])  # row vector

        b_freq = WB_mtx.sum(axis=0)  # row vector
        denom = sp.csr_matrix(c_freq.T @ b_freq)

        # natural logarithm
        ppmi = sp.csr_matrix( ((WC_mtx.shape[0]) * cooccurrences) / (denom))
        ppmi.data = np.log(ppmi.data)

        prod = sp.csr_matrix(cooccurrences/float(WC_mtx.shape[0]))
        prod.data = 1 / - np.log(prod.data)
        nppmi = ppmi.multiply(prod)
        # nppmi.data = np.nan_to_num(nppmi.data)

        # do not keep negative values
        nppmi[nppmi < 0] = 0.0
        nppmi = sp.csr_matrix(nppmi)

        print("nppmi: ", nppmi.shape)
        self.save_nppmi(nppmi)
        return nppmi

    def save_nppmi(self, mtx):
        ppmi_name = os.path.join(("../results/nppmi/matrix/" + self.rand2text()), self.embedding_name, self.concept_name,
                                 ("nppmi_mtx.npz"))
        utils.save_npz(ppmi_name, mtx)

    def get_alignments(self):
        print("Associating a concept to each base...")
        b2c = Base2Concept(self)
        b2c.save_max_order()
        b2c.sample_max_concept()
        print("Associating a base to each concept...")
        c2b = Concept2Base(self)
        c2b.sample_max_base()
        # print("Associating several concepts to each base...")
        # b2c.get_base_concept_pairs(one2one=False)
        # b2c.sample_max_concept(one2one=False)
        # print("Associating several bases to each concept...")
        # c2b.get_concept_base_pairs(one2one=False)
        # print("computing max-max alignment...")
        # self.max_max_alignment()

    def max_max_alignment(self):
        max_concepts_name = os.path.join(("../results/nppmi/max_concepts/" + self.rand2text()),
                                 self.embedding_name,
                                 self.concept_name,
                                 ("max_concepts_of_base.p"))
        max_bases_name = os.path.join(("../results/nppmi/max_bases/" + self.rand2text()),
                                      self.embedding_name,
                                      self.concept_name,
                                     ("max_base_of_a_concept.p"))
        max_bases = pickle.load(open(max_bases_name, 'rb'))
        max_concepts = pickle.load(open(max_concepts_name, 'rb'))

        max_max = defaultdict(list)
        for b_ind in range(self.E.shape[1]):
            c_s1 = max_concepts[b_ind]
            c_s2= [concept for concept in self.c2i.keys() if b_ind in max_bases[concept]]

            max_max[b_ind] = set(c_s1).intersection(set(c_s2))

        f_name = os.path.join("../results/nppmi/max_max/",
                              self.embedding_name,
                              self.concept_name,
                              ("max_max_alignments.csv"))
        utils.makedir(f_name)
        file = open(f_name, "w")
        file.write("Base\tConcepts\tWords\n")
        for b, c_list in max_max.items():
            if len(c_list) >0:
                col = ((self.E.getcol(b)).toarray().T)[0, :]
                nonzero = [j for (j, value) in enumerate(col) if value > 0]
                connected_to_concepts = [j for j in nonzero if set(self.word_concept_dict[self.i2w[j]]).intersection(set(c_list)) != set()]
                ind = []
                if len(nonzero) > 0:
                    ind = np.random.choice(nonzero, np.min([10, len(nonzero)]))
                if len(connected_to_concepts) > 0:
                    ind2 = np.random.choice(connected_to_concepts, np.min([10, len(connected_to_concepts)]))
                words = [self.i2w[i] for i in ind]
                words_conn = [self.i2w[i] for i in ind2]
                words = "[ " + " ".join(words) + " ]"
                words_conn = "[ " + " ".join(words_conn) + " ]"
                concepts = "[" + " ".join(c_list) + "]"
                file.write((str(b) + "\t" + concepts + "\t" + words + "\t" + words_conn+ "\n"))
        file.close()


def main():
    parser = argparse.ArgumentParser(description='Process some integers.')
    parser.add_argument('--embedding', required=True, type=str, help='Path to (filtered) npz sparse matrix.')
    parser.add_argument('--concept-file', required=False, type=str,
                        default='../data/conceptnet/assertions/propagated_animals_conceptnet56_assertions.json',
                        help='Path to short ConceptNet json file')
    parser.add_argument('--rel', required=False, type=bool,
                        default=False,
                        help='True if relations should be used. Default: False')
    parser.add_argument('--language', required=False, type=str, default='en',
                        help='Language of conceptnet and sparse matrix files. Default: en')
    parser.add_argument('--cont-sparse', required=False, type=bool, default=False,
                        help='True if sparse embedding should be continous instead of binary. Out of use. Default: False')
    parser.add_argument('--thd', required=False, type=int, default=-1,
                        help='Treshold for concept frequency (assertion file should be previously preprocessed according to treshold).')
    parser.add_argument('--longname', required=False, type=bool, default=False,
                        help='')
    args = parser.parse_args()
    print("Command line arguments were ", args)

    if args.thd != -1:
        cm = Aligner(args.embedding, args.concept_file, args.cont_sparse, args.thd, args.language, args.longname, args.rel)
        cm.calculate_NPPMI()
        cm.get_alignments()
    else:
        for thd in [40, 30, 20, 10, 5]:#0
            cm = Aligner(args.embedding, args.concept_file, args.cont_sparse, thd, args.language, args.longname, args.rel)
            cm.calculate_NPPMI()
            cm.get_alignments()



if __name__ == "__main__":
    main()
