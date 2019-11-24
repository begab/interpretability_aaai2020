import argparse
import os
import numpy as np
import pickle
import json
import sys
sys.path.append('../')
import src.utils as utils
from scipy.stats import hypergeom
import scipy.sparse as sp
from scipy.spatial.distance import cosine
from collections import defaultdict, OrderedDict
from sklearn.preprocessing import normalize

class Evaluator(object):
    def __init__(self, alignment_path, out_path, dense):
        self.dense = True
        self.out_path = out_path
        self.index_name, self.sparse_name, self.concept_name, self.full_name, self.thd, self.binary, self.random = self.load_names(alignment_path)
        self.i2c, self.c2i, self.i2w, self.w2i, self.word_concept_dict = self.load_indexing()
        self.E, self.C, self.alignment = self.load_files(alignment_path)

    def load_names(self, alingment_path):
        path, base = os.path.split(alingment_path)
        path = path.replace("\\", "/")
        random = False
        if alingment_path.find("random1") != -1:
            random = True
        print(path, base)
        sparse_name = (path.strip().split("/"))[-2]
        index_name = (sparse_name.strip().split(".npz"))[0]
        concept_name = (path.strip().split("/"))[-1]

        full_name = (os.path.basename(alingment_path).strip().split("max_concepts_of_base_"))[-1]
        full_name = (full_name.split(".p"))[0]

        binary = True
        if full_name.find("binary") != -1:
            binary = True

        thd = (concept_name.split("_t"))[-1]
        print(index_name, sparse_name, concept_name, full_name, thd, binary, random)
        return index_name, sparse_name, concept_name, full_name, thd, binary, random

    def random2str(self):
        text = ""
        if self.random:
            text = "random1/"
        return text

    def load_indexing(self):
        i2c = pickle.load(open(('../data/indexing/concept/' + self.concept_name + "_i2c.p"), 'rb'))
        c2i = pickle.load(open('../data/indexing/concept/' + self.concept_name + "_c2i.p", 'rb'))
        i2w = pickle.load(open('../data/indexing/words/embeddings/' + self.index_name + "_i2w.p", 'rb'))
        w2i = pickle.load(open('../data/indexing/words/embeddings/' + self.index_name + "_w2i.p", 'rb'))
        word_concept_dict = pickle.load(open(('../data/word_concept_dict/' + self.concept_name + "_word_concept_dict.p"), 'rb'))
        return i2c, c2i, i2w, w2i, word_concept_dict

    def load_files(self, alignment_path):
        if self.dense:
            sparse_path = "../data/sparse_matrices/word_base/embeddings/filtered/" + self.random2str() + self.sparse_name + ".p"
            E = pickle.load(open(sparse_path, 'rb'))
        else:
            if alignment_path.find("random") != -1:
                sparse_path = "../data/sparse_matrices/word_base/" + self.random2str() + self.sparse_name + ".npz"
            sparse_path = "../data/sparse_matrices/word_base/embeddings/filtered/" + self.random2str() + self.sparse_name + ".npz"
            E = sp.load_npz(sparse_path)
        print("alignment path: ", alignment_path)
        alignment = pickle.load(open(alignment_path, 'rb'), encoding='utf-8')
        no_random_sparse_name = (self.sparse_name.strip().split(".npz_random"))[0]
        concept_path = os.path.join("../data/sparse_matrices/word_concept/", no_random_sparse_name,
                                self.concept_name,
                                "word_concept_mtx.npz")
        C = sp.load_npz(concept_path)
        E = normalize(E, norm='l2', axis=1)
        E = sp.csc_matrix(E)
        C = normalize(C, norm='l2', axis=1)
        C = sp.csc_matrix(C)
        return E, C, alignment

    def arange_concepts(self, concepts):
        if type(concepts) != type(list()):
            tmp = concepts
            concepts = set()
            if tmp != "NONE":
                concepts.add(tmp)
        return set(concepts)

    def mrr(self):
        out_rr_list = []
        rr_list = []
        r_list = []
        denom = 0.0
        for i in range(self.E.shape[1]):
            concepts = self.alignment[i]
            concepts = self.arange_concepts(concepts)
            if len(concepts) > 0:
                denom += 1.0
                col = (self.E.getcol(i).toarray().T)[0, :]
                sorted_col = sorted(enumerate(col), key=lambda e: float(e[1]), reverse=True)
                words_rank = [(self.i2w[original_id], rank) for rank, (original_id, value) in
                               enumerate(sorted_col, 1) if value > 0]
                words_rank_cn = [(word, rank) for (word, rank) in words_rank if
                                    len(concepts.intersection(self.word_concept_dict[word])) > 0]

                # assert len(words_rank_cn) != 0
                # assert len(words_rank) != 0
                if len(words_rank_cn)!=0:
                    sorted_relevant = sorted(words_rank_cn, key=lambda e: e[1])
                    first_rr= float(1 / sorted_relevant[0][1])
                    rr_list.append(first_rr)
                    r_list.append(sorted_relevant[0][1])
                    out_rr_list.append((first_rr, sorted_relevant[0][1]))
                else:
                    rr_list.append(0.0)
                    r_list.append(self.E.shape[0])
                    out_rr_list.append((0.0, self.E.shape[0]))
            else:
                out_rr_list.append((0.0, self.E.shape[0]))
        utils.pickler("../results/evaluation/cummulated/" + self.sparse_name + "_mrr_r_cummulated.p", out_rr_list)
        return sum(rr_list)/denom, sum(r_list)/denom

    def map(self, k=50):
        ap_list = []
        out_ap_list = []
        denom = 0.0
        for i in range(self.E.shape[1]):
            concepts = self.alignment[i]
            concepts = self.arange_concepts(concepts)
            if len(concepts) > 0:
                denom += 1.0
                col = (self.E.getcol(i).toarray().T)[0, :]
                sorted_col = sorted(enumerate(col), key=lambda e: float(e[1]), reverse=True)
                nonzero = [(self.i2w[original_id]) for original_id, value in
                              sorted_col if value > 0]
                relevant = []
                for j in range(k): #range(len(nonzero)):
                    if len(nonzero) >= k and len(concepts.intersection(self.word_concept_dict[nonzero[j]])) > 0: #concepts in self.word_concept_dict[nonzero[j]]:
                        relevant.append(1)
                    else:
                        relevant.append(0)
                avg_list = []
                for j in range(k): #range(len(nonzero)):
                    avg_list.append(np.sum(relevant[0:j])/(j+1))
                ap_list.append(np.sum(avg_list)/len(avg_list))
                out_ap_list.append(np.sum(avg_list) / len(avg_list))
            else:
                out_ap_list.append(0.0)
        utils.pickler("../results/evaluation/cummulated/" + self.sparse_name + "_map_cummulated.p", out_ap_list)
        return np.sum(ap_list)/denom

    def mp(self, k=50):
        p_list = []
        out_p_list = []
        denom = 0.0
        for i in range(self.E.shape[1]):
            concepts = self.alignment[i]
            concepts = self.arange_concepts(concepts)
            if len(concepts) > 0:
                denom += 1.0
                col = enumerate( (self.E.getcol(i).toarray().T)[0, :] )
                nonzero = [(ind, val) for ind, val in col if val > 0]
                nonzero = sorted(nonzero, reverse=True, key=lambda e: float(e[1]))
                nonzero = nonzero[0:k]
                all = [self.i2w[original_index] for (original_index, value) in nonzero]
                relevant = [word for word in all if
                             len(concepts.intersection(self.word_concept_dict[word])) > 0] #concepts in self.word_concept_dict[word]]
                # assert len(relevant)!= 0
                # assert len(all) != 0
                if len(all) != 0:
                    p_list.append(len(relevant)/len(all))
                    out_p_list.append(len(relevant)/len(all))
                else:
                    p_list.append(0.0)
                    out_p_list.append(0.0)
            else:
                out_p_list.append(0.0)
        utils.pickler("../results/evaluation/cummulated/" + self.sparse_name + "_mp_cummulated.p", out_p_list)
        return np.sum(p_list)/denom

    def takeSecond(self, elem):
        return elem[1]

    def distance_ratio(self, k=5): # from rotated word embeddings paper
        intra = 0.0
        inter = 0.0
        for i in range(self.E.shape[1]):
            concept = self.alignment[i]
            col = enumerate( (self.E.getcol(i).toarray().T)[0, :])
            nonzero = [(original_index, value) for (original_index, value) in col if value>0]
            sorted_nonzero = sorted(nonzero, reverse=True, key=self.takeSecond)
            k2 = np.min([k, len(sorted_nonzero)])
            top_k_words = [index for (index, value) in sorted_nonzero[0:k2]]
            intra += self.intra_distance_ratio(top_k_words)
            inter += self.inter_distance_ratio(top_k_words, concept)

        print("inter: ", inter)
        print("intra: ", intra)
        overall_distance_ratio = float(inter)/float(intra) #(1.0/float(self.E.shape[1])) * (float(inter)/float(intra))
        return overall_distance_ratio

    def intra_distance_ratio(self, words):
        k = float(len(words))
        if k <= 1.0:
            return 0.0
        word_vectors = [self.E.getrow(ind).todense() for ind in words]
        nom = 0
        for i in range(len(word_vectors)):
            for j in range(len(word_vectors)):
                nom += cosine(word_vectors[i], word_vectors[j])
        ret = nom/(k*(k-1))

        return ret

    def avg_concept_vector(self, concept_words):
        word_vectors = [self.E.getrow(ind).todense() for ind in concept_words]
        nom = np.zeros((1,self.E.shape[1]))
        denom = len(word_vectors)
        for i in range(len(word_vectors)):
            nom += word_vectors[i]
        return nom/float(denom)

    def inter_distance_ratio(self, words, concept):
        k = float(len(words))
        word_vectors = [self.E.getrow(ind).todense() for ind in words]
        concept_ind = self.w2i.get(concept, None)
        # if concept_ind != None:
            # concept_vector = self.E.getrow(concept_ind).todense()
        # else:
        concept_ind = (self.c2i[concept])
        col = enumerate( (self.C.getcol(concept_ind).toarray().T)[0, :])
        nonzero = [(original_index, value) for (original_index, value) in col if value > 0.0]
        sorted_nonzero = sorted(nonzero, reverse=True, key=self.takeSecond)
        concept_words = [ind for (ind, value) in sorted_nonzero]
        cw = [self.i2w[ind] for ind in concept_words]
        # print("concept: ", concept, " words: ", cw)
        assert len(concept_words) != 0
        # avg_concept_vector = self.avg_concept_vector(concept_words)# self.intra_distance_ratio(concept_words)
        ret = self.intra_distance_ratio(concept_words)
        # nom = 0.0
        # for i in range(len(word_vectors)):
        #     nom += cosine(word_vectors[i], avg_concept_vector)
        # ret = nom/k
        return ret

    def avg_pairwise_product(self, values):
        sum = 0.0
        for i in values:
            for j in values:
                sum += i*j
        return sum/(2*len(values))

    def list_product(self, values):
        return np.prod(values)

    def intersection_ranking(self):
        reciprocal_ranks = []
        ranks = []
        for i in range(self.E.shape[1]):
            values_to_rank = []
            concept = self.alignment[i]
            if concept != "NONE":
                col = enumerate( (self.E.getcol(i).toarray().T)[0, :])
                intersection_pairs = [(original_index, value) for (original_index, value) in col
                                if (value > 0 and concept in self.word_concept_dict[self.i2w[original_index]])]
                intersection_ind = [ind for (ind, value) in intersection_pairs]
                intersection_value = [value for (ind, value) in intersection_pairs]
                focus_value = self.avg_pairwise_product(intersection_value)
                print("base: ", i, "\tintersection size: ", len(intersection_ind), "\tvalue: ", focus_value, end="")
                values_to_rank.append(focus_value)
                for j in range(self.E.shape[1]):
                    comaparsion_col = enumerate((self.E.getcol(j).toarray().T)[0, :])
                    comparison_values = [value for (ind, value) in comaparsion_col if ind in intersection_ind]
                    assert len(intersection_ind) == len(comparison_values)
                    value = self.avg_pairwise_product(comparison_values)
                    values_to_rank.append(value)
                values_to_rank = sorted(values_to_rank, reverse=True)
                rank = values_to_rank.index(focus_value) + 1 # indexing from 0
                print("\trank: ", rank)
                reciprocal_ranks.append((1.0/rank))
                ranks.append(rank)
        mean_reciprocal_rank = np.mean(reciprocal_ranks)
        mean_rank = np.mean(ranks)
        return mean_rank, mean_reciprocal_rank

    def get_test_ind(self, concepts, test_size):
        test_inds = set()
        for concept in concepts:
            tmp_set = set(test_size[self.c2i[concept]][1])
            test_inds = test_inds.union(tmp_set)
        return test_inds

    def test_set_evaluation_by_base(self, k=5):
        if self.sparse_name.find("animals") != -1:
            sparse_name = (self.sparse_name.strip().split("emb"))[0]
            sparse_name = (sparse_name.split("animals_"))[-1]
            frequency_name = os.path.join("../data/word_frequency",
                                          (sparse_name + "emb.gz_frequency.p"))
        else:
            frequency_name = os.path.join("../data/word_frequency",
                                      ((self.sparse_name.strip().split("emb"))[0] + "emb.gz_frequency.p"))
        frequency = pickle.load(open(frequency_name, "rb"))
        test_set_name = os.path.join("../data/sparse_matrices/word_concept/splitted/test_size/", self.sparse_name, self.concept_name, "test_size.npz")
        test_size = pickle.load(open(test_set_name, "rb"))
        avg_acc = 0.0
        avg_k_acc = 0.0
        sum = 0.0
        out_acc = []
        for i in range(self.E.shape[1]):
            concepts = self.alignment[i]
            concepts = self.arange_concepts(concepts)
            if len(concepts) > 0:
                test_inds = self.get_test_ind(concepts, test_size)
                col = enumerate( (self.E.getcol(i).toarray().T)[0, :])
                nonzero = {(ind,value) for (ind, value) in col if value > 0}
                words_connected_to_concept = {(ind, value) for (ind, value) in nonzero
                                              if len(concepts.intersection(self.word_concept_dict[self.i2w[ind]])) > 0}
                train = {(ind, value) for (ind, value) in words_connected_to_concept if ind not in test_inds}
                # print(words_connected_to_concept)
                # print(train, "\n")
                k_nonzero = nonzero.difference(train)
                # k_nonzero = [(ind, value) for (ind, value) in nonzero if ind not in train]
                k_nonzero = sorted(k_nonzero, key=lambda t: float(frequency.index(self.i2w[t[0]])), reverse=False)
                set_k_nonzero = set([ind for (ind, val) in k_nonzero][0: (k*len(test_inds))])
                set_nonzero = {ind for ind, val in nonzero}
                set_test = set(test_inds)
                intersection = set_test.intersection(set_nonzero)
                k_intersection = set_test.intersection(set_k_nonzero)

                acc = 0.0
                k_acc = 0.0
                if len(test_inds) != 0:

                    acc = len(intersection)/len(set_test)
                    k_acc = len(k_intersection)/len(set_test)

                avg_acc += acc
                avg_k_acc += k_acc
                sum += 1.0
                out_acc.append((acc, k_acc))
            else:
                out_acc.append((0.0, 0.0))
        utils.pickler("../results/evaluation/cummulated/" + self.sparse_name + "_tsa_base_k_acc_cummulated.p", out_acc)
        avg_acc = avg_acc/sum
        avg_k_acc = avg_k_acc/sum
        return avg_acc, avg_k_acc

    def test_set_evaluation_by_concept(self, k=5):
        test_set_name = os.path.join("../data/sparse_matrices/word_concept/splitted/test_size/", self.sparse_name,
                                     self.concept_name, "test_size.npz")
        test_size = pickle.load(open(test_set_name, "rb"))
        avg_acc = 0.0
        avg_k_acc = 0
        denom = 0.0
        out_acc = []
        aligned_concepts = {concept for concepts in self.alignment.values() for concept in concepts if isinstance(concepts, list)}
        # print("Number of concepts aligned: ", len(aligned_concepts))
        if "NONE" in aligned_concepts:
            aligned_concepts.remove("NONE")
        for concept in aligned_concepts:
            denom += 1.0
            test_inds = set(test_size[self.c2i[concept]][1])
            # compute bases connected to concept
            bases = [b for b, c_list in self.alignment.items() if concept in set(c_list)]

            # gather nonzero words in bases that are connected to concept
            bases_ind_set = set()
            bases_val_set = set()
            for b in bases:
                col = enumerate((self.E.getcol(b).toarray().T)[0, :])
                nonzero_val = {(ind, value) for (ind, value) in col if value > 0}
                nonzero_ind = {ind for (ind, value) in nonzero_val}
                bases_val_set = bases_val_set.union(nonzero_val)
                bases_ind_set = bases_ind_set.union(nonzero_ind)
            intersection_ind = test_inds.intersection(bases_ind_set)
            intersection_val = {(ind, value) for (ind, value) in bases_val_set if ind in intersection_ind}
            words_connected_to_concept = {(ind, value) for (ind, value) in bases_val_set if
                                          concept in self.word_concept_dict[self.i2w[ind]]}
            sorted_wcc = sorted(words_connected_to_concept, reverse=True, key=lambda e: float(e[1]))
            first_k_connected = set()
            counter = 0
            counter2 = 0
            while counter < k*len(test_inds) and counter2 < len(sorted_wcc):
                elem = sorted_wcc[counter2]
                counter2 += 1
                if elem[0] not in first_k_connected:
                    counter += 1
                    first_k_connected.add(elem[0])
            intersection_k_val = first_k_connected.intersection(test_inds)

            if len(test_inds) > 0:
                acc = len(intersection_ind)/len(test_inds)
                k_acc = len(intersection_k_val)/len(test_inds)
            else:
                acc = 0.0
                k_acc = 0.0
            avg_k_acc += k_acc
            avg_acc += acc
            out_acc.append((acc, k_acc))
        utils.pickler("../results/evaluation/cummulated/" + self.sparse_name + "_tsa_concept_k_acc_cummulated.p", out_acc)

        avg_k_acc = avg_k_acc/denom
        avg_acc = avg_acc/denom
        print("avg acc by concept: ", avg_acc, avg_k_acc)
        return avg_acc, avg_k_acc

    def p_value(self):
        p_values = []
        for i in range(self.E.shape[1]):
            concepts = self.alignment[i]
            concepts = self.arange_concepts(concepts)
            if len(concepts) > 1 or  ('a' not in concepts and len(concepts) > 0):
                xi = self.E.getcol(i).indices
                xi = set(xi)
                concepts = self.alignment[i]
                concepts = self.arange_concepts(concepts)
                concept_indices = {self.c2i[c] for c in concepts}
                yi = []
                for c_ind in concept_indices:
                    yi_part = list(self.C.getcol(c_ind).indices)
                    yi.extend(yi_part)
                intersection_size = len(xi.intersection(yi))

                p_val = hypergeom.cdf(intersection_size-1, self.E.shape[0], len(xi), len(yi))
                p_val = 1-p_val
                p_values.append(p_val)
            else:
                p_values.append(1.0)
        print("Average p-value: ", sum(p_values)/self.E.shape[1])

    def getNones(self):
        nones = sum([1 for k, v in self.alignment.items() if v == "NONE"])
        return nones/self.E.shape[1]

    def evaluate(self):
        # dr = self.distance_ratio()
        results = {}
        results["mrr"], results["ar"] = self.mrr()
        print("mrr: ", results["mrr"], "ar: ", results["ar"])
        results["mp"] = self.mp()
        print("mp: ", results["mp"])
        results["map"] = self.map()
        print("map: ", results["map"])
        results["tsa_b"], results["tsa_bk"] = self.test_set_evaluation_by_base()
        print("test set accuracy by base: ", results["tsa_b"], results["tsa_bk"])
        results["tsa_c"], results["tsa_ck"] = self.test_set_evaluation_by_concept()
        print("test et accuracy by concept: ", results["tsa_c"], results["tsa_ck"])
        results["nones"] = self.getNones()
        print("nones ratio: ", results["nones"])
        return results

    def save_results(self):
        # --------- json ---------
        if not os.path.exists(self.out_path) or os.path.getsize(self.out_path) <= 0:
            utils.makedir(self.out_path)
            open(self.out_path, "a", encoding="utf-8").close()
            json_data = []
            json.dump(json_data, open(self.out_path, "w"))
        json_data = json.load(open(self.out_path, encoding="utf-8"))
        json_data = json_data

        # --------- csv ---------
        csv_name = ".".join((self.out_path.strip().split("."))[0:-1]) + ".csv"
        out_csv = open(csv_name, 'a', encoding='utf-8')

        results = self.evaluate()
        results_dict = OrderedDict()
        results_dict["tsa_base"] = results["tsa_b"]
        results_dict["tsa_base_k"] = results["tsa_bk"]
        results_dict["tsa_concept"] = results["tsa_c"]
        results_dict["tsa_concept_k"] = results["tsa_ck"]
        results_dict["mrr"] = results["mrr"]
        results_dict["mp"] = results["mp"]
        results_dict["map"] = results["map"]
        results_dict["nones"] = results["nones"]

        data_dict = OrderedDict()
        data_dict["embedding"] = self.sparse_name
        data_dict["KB"] = self.concept_name
        data_dict["results"] = results_dict
        if data_dict not in json_data:
            json_data.append(data_dict)
        # print(json_data)
        values = list(results_dict.values())
        values = [str(v) for v in values]
        values_txt = "\t".join(values)
        keys = list(results_dict.keys())
        keys_txt = "\t".join(keys)
        if os.path.getsize(csv_name) <= 0:
            out_csv.write(("Embedding\tThd\t" + keys_txt + "\n"))
        # ------ write --------
        json.dump(json_data, open(self.out_path, "w"))
        out_csv.write((self.sparse_name + "\t" + self.thd + "\t" + values_txt + "\n"))
        print((self.sparse_name + "\t" + values_txt + "\n"))
        out_csv.close()
        print("\tWrote to ", out_csv)

    def false_positive_rate(self):
        p_list = []
        out_p_list = []
        denom = 0.0
        for i in range(self.E.shape[1]):
            concepts = self.alignment[i]
            concepts = self.arange_concepts(concepts)
            if len(concepts) > 0:
                denom += 1.0
                col = enumerate((self.E.getcol(i).toarray().T)[0, :])
                nonzero = [ind for ind, val in col if val > 0]
                relevant = [word for word in set(self.i2w.values()) if
                            len(concepts.intersection(
                                self.word_concept_dict[word])) > 0]  # concepts in self.word_concept_dict[word]]
                fp_tn = len(relevant)
                nonzero_words = set([self.i2w[i] for i in nonzero])
                fp = len(nonzero_words.intersection(set(relevant)))
                if fp_tn != 0:
                    p_list.append(fp / fp_tn)
                    out_p_list.append(fp / fp_tn)
                else:
                    p_list.append(0.0)
                    out_p_list.append(0.0)
            else:
                out_p_list.append(0.0)
        utils.pickler("../results/evaluation/cummulated/" + self.sparse_name + "_fpr_cummulated.p", out_p_list)
        return np.sum(p_list) / denom

def main():
    parser = argparse.ArgumentParser(description='Process some integers.')
    parser.add_argument('--language', required=False, type=str, default='en', help='Language of conceptnet and sparse matrix files. Default: en')
    parser.add_argument('--dense', required=False, type=bool, default=False)
    parser.add_argument('--alignment', required=False, type=str,
                        default='../results/nppmi/max_concept/glove.6B.400k.300d.txt_f_conceptnet56_top50000/conceptnet56_top50000_t40/max_concepts_of_base.p',
                        help='Pickle containing the alignment of a concept to a base')
    parser.add_argument('--out', required=False, type=str, default='../results/McRae.json', help='Path to utput json file')
    args = parser.parse_args()
    print("Command line arguments were ", args)
    ev = Evaluator(args.alignment, args.out, args.dense)
    print("Ratio of bases with no concepts aligned: ", ev.getNones())
    ev.p_value()
    print("False Positive Rate: ", ev.false_positive_rate())
    print("Computing other evaluation metrics...")
    ev.save_results()
    # ev.test_set_evaluation_by_base()
    # ev.test_set_evaluation_by_concept()
    # ev.test_set_evaluation_by_base()
if __name__ == "__main__":
     main()