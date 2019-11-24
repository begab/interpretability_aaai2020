import json
import argparse
import os
import copy
import sys
import pickle
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from collections import defaultdict, OrderedDict

sys.path.append('../../')
import src.utils


STOPWORDS = set(stopwords.words('english'))

class ConceptData(object):
    def __init__(self, name, i2c, c2i, word_concept_dict):
        self.name = name
        self.i2c = i2c
        self.c2i = c2i
        self.word_concept_dict = word_concept_dict

class Propagator(object):
    def __init__(self, json_path, top50000_path, depth=3):
        self.depth = depth
        self.name = (os.path.basename(json_path).strip().split("_assertions"))[0]
        if os.path.exists(top50000_path):
            self.top50000_words = set(pickle.load(open(top50000_path, 'rb')))
            self.top_name = "_top50000"
        else:
            self.top50000_words = set()
            self.top_name = ""
        self.json_data = json.load(open(json_path, encoding='utf-8'))
        # self.concept_data = concept_data
        self.bidir_rels = {"/r/RelatedTo", "/r/Synonym", "/r/Antonym", "/r/DistinctFrom",
                              "/r/LocatedNear", "/r/SimilarTo","/r/EtymologicallyRelatedTo"}

    def get_parent_dict(self):
        parent_dict = defaultdict(set)
        parent_dict_list = {}
        if len(self.top50000_words)!= 0:
            for d in self.json_data:
                word = d['start'].strip()
                concept = d['end'].strip()
                rel = d['rel']
                if len(d["start"].split("/")) > 1:
                    word = (d["start"].strip().split("/"))[3]
                    concept = (d['end'].strip().split("/"))[3]
                tokenized_word = (word_tokenize(word))[0]
                if tokenized_word not in STOPWORDS and word in self.top50000_words:
                        parent_dict[word].add(concept)
                        if rel in self.bidir_rels and concept in self.top50000_words:
                            parent_dict[concept].add(word)
        for w, c in parent_dict.items():
            print(w,c)
            parent_dict_list[w] = list(c)
        return parent_dict_list

    def propagate_n(self):
        parent_dict = self.get_parent_dict()
        propagated_wc_dict = copy.deepcopy(parent_dict)
        i = 0
        while i < self.depth:
            i += 1
            for child, parents in propagated_wc_dict.items():
                print(type(parents))
                for parent in parents:
                    propagated_wc_dict[child].extend(parent_dict[parent])
        out_name = "../data/word_concept_dict/propagated_" + self.name + self.top_name + ".p"
        utils.pickler(out_name, propagated_wc_dict)
        return propagated_wc_dict

    # def propagate_relations(self):
    #     propagated_wc_dict = defaultdict(set)
    #     for child, parents in self.parent_dict.items():
    #         child_concepts = self.concept_data.word_concept_dict[child]
    #         # print(child)
    #         # print("before: ", child_concepts)
    #         for parent in parents:
    #             propagated_concepts = self.get_ancestor_concepts(parent, child_concepts)
    #             propagated_wc_dict[child] = propagated_wc_dict[child].union(propagated_concepts)
    #         # print("after: ", propagated_wc_dict[child], "\n")
    #     out_name = "../data/word_concept_dict/propagated_" + self.concept_data.name + ".p"
    #     utils.pickler(out_name, propagated_wc_dict)
    #     return propagated_wc_dict
    #
    # def get_ancestor_concepts(self, ancestor, ancestor_concepts):
    #     tmp = ancestor_concepts.copy()
    #     parent_dict = self.parent_dict.copy()
    #     ancestor_concepts = ancestor_concepts.union(self.word_concept_dict[ancestor])
    #     if len(tmp) != len(ancestor_concepts):
    #         for parent in parent_dict[ancestor]:
    #             # ancestor_concepts = ancestor_concepts.union(self.word_concept_dict[parent])
    #             ancestor_concepts = ancestor_concepts.union(self.get_ancestor_concepts(parent, ancestor_concepts))
    #     return ancestor_concepts

class Preprocessor(object):
    def __init__(self, json_path, language, top50000):
        if os.path.exists(top50000):
            self.top50000_words = set(pickle.load(open(top50000, 'rb')))
            self.top_name = "_top50000"
        else:
            self.top50000_words = set()
            self.top_name = ""
        self.name = (os.path.basename(json_path).strip().split("_assertions"))[0]
        print(self.name)
        self.json_data = json.load(open(json_path, encoding='utf-8'))
        self.bidirecitonal_relations = ["/r/RelatedTo", "/r/Synonym",
                                        "/r/Antonym", "/r/DistinctFrom",
                                        "/r/LocatedNear", "/r/SimilarTo",
                                        "/r/EtymologicallyRelatedTo"]

    def get_Concept_Data(self):
        word_concept_dict = defaultdict(set)
        word_concept_dict_with_rel = defaultdict(set)

        concepts = set()
        concepts_with_rel = set()
        vocabulary = set()

        for d in self.json_data:
            word = d["start"].strip()
            if len(d["start"].split("/")) > 1:
                word = (d["start"].split("/"))[3]
            # tokenized_word = (word_tokenize(word))[0]
            if True: #tokenized_word not in STOPWORDS:
                if len(self.top50000_words)==0 or word in self.top50000_words:
                    vocabulary.add(word)

                    rel = d["rel"]
                    concept = d["end"].strip()

                    if len(d["end"].split("/")) > 2:
                        concept = (d["end"].split("/"))[3]

                    concept_with_rel = concept + rel
                    concepts.add(concept)
                    concepts_with_rel.add(concept_with_rel)

                    word_concept_dict[word].add(concept)
                    word_concept_dict_with_rel[word].add(concept_with_rel)

                    if rel in self.bidirecitonal_relations and concept in self.top50000_words:
                        word_concept_dict[concept].add(word)
                        word_concept_dict_with_rel[concept].add((word + rel))
                        concepts.add(word)
                        concepts_with_rel.add((word+rel))
                        vocabulary.add(concept)
        print('Vocab len: ', len(vocabulary))
        i2c, c2i = self.get_concept_indexing(concepts)
        i2c_with_rel, c2i_with_rel = self.get_concept_indexing(concepts_with_rel)
        cd = ConceptData(self.name, i2c, c2i, word_concept_dict)
        cd_with_rel = ConceptData((self.name + "_with_rel"), i2c_with_rel, c2i_with_rel, word_concept_dict_with_rel)

        return cd, cd_with_rel, sorted(vocabulary)

    def get_concept_indexing(self, concepts):
        concepts = sorted(list(set( concepts )))
        i2c = {}
        c2i = {}
        # print(concepts[0:10])
        for number, concept in enumerate(concepts):
            i2c[number] = concept
            c2i[concept] = number
        print("Number of concepts: ", len(i2c.keys()))
        return i2c, c2i

    def save_concept_data(self):
        cd, cd_with_rel, vocabulary = self.get_Concept_Data()

        index_path = "../data/indexing/concept/"
        utils.pickler((index_path + self.name + self.top_name + "_i2c.p"), cd.i2c)
        utils.pickler((index_path + self.name + self.top_name + "_t0_i2c.p"), cd.i2c)
        utils.pickler((index_path + self.name + self.top_name + "_c2i.p"), cd.c2i)
        utils.pickler((index_path + self.name + self.top_name + "_t0_c2i.p"), cd.c2i)

        utils.pickler((index_path + self.name + self.top_name + "_with_rel_i2c.p"), cd_with_rel.i2c)
        utils.pickler((index_path + self.name + self.top_name + "_with_rel_c2i.p"), cd_with_rel.c2i)

        dict_path = "../data/word_concept_dict/"
        utils.pickler((dict_path + self.name + self.top_name + "_word_concept_dict.p"), cd.word_concept_dict)
        utils.pickler((dict_path + self.name + self.top_name + "_t0_word_concept_dict.p"), cd.word_concept_dict)
        utils.pickler((dict_path + self.name + self.top_name + "_with_rel_word_concept_dict.p"), cd_with_rel.word_concept_dict)

        vocab_path = "../data/vocabulary/"
        utils.pickler((vocab_path + self.name + self.top_name + "_vocabulary.p"), vocabulary)
        utils.pickler((vocab_path + self.name + self.top_name + "_t0_vocabulary.p"), vocabulary)

class Thresholder(object):
    def __init__(self, thd, concept_data, top_name):
        self.top_name = top_name
        self.concept_data = concept_data
        self.thd = thd
        self.frequency = self.concept_frequency()

    def concept_frequency(self):
        word_concept_dict = self.concept_data.word_concept_dict
        concept_freq = defaultdict(int)
        for word, clist in word_concept_dict.items():
            for c in clist:
                concept_freq[c] += 1
        return concept_freq

    def threshold(self):
        indices_to_drop = set()
        indices_to_keep = set()
        for c, f in self.frequency.items():
            # print(c,f)
            if f < self.thd:
                indices_to_drop.add(self.concept_data.c2i[c])
            else:
                indices_to_keep.add(self.concept_data.c2i[c])

        new_i2c = copy.deepcopy(self.concept_data.i2c)
        for i in indices_to_drop:
            new_i2c.pop(i, None)

        new_i2c = {i: v for i, (k, v) in enumerate(new_i2c.items())}
        new_c2i = {v: k for k,v in new_i2c.items()}

        new_wc_dict = copy.deepcopy(self.concept_data.word_concept_dict)
        for word, concept_list in self.concept_data.word_concept_dict.items():
            new_clist = copy.deepcopy(concept_list)
            for c in concept_list:
                if self.concept_data.c2i[c] in indices_to_drop:
                    new_clist.remove(c)
            new_wc_dict[word] = new_clist
        print("Number of concepts: ", len(new_i2c.keys()))
        self.save(new_i2c, new_c2i, new_wc_dict)
        return new_i2c, new_c2i, new_wc_dict

    def save(self, i2c, c2i, wc_dict):
        index_base_name = "../data/indexing/concept/" + self.concept_data.name + self.top_name + "_t" + str(self.thd)
        i2c_name = index_base_name + "_i2c.p"
        c2i_name = index_base_name + "_c2i.p"
        wc_name = "../data/word_concept_dict/" + self.concept_data.name + self.top_name + "_t" + str(self.thd) + "_word_concept_dict.p"
        utils.pickler(i2c_name, i2c)
        utils.pickler(c2i_name, c2i)
        utils.pickler(wc_name, wc_dict)


def main():
    parser = argparse.ArgumentParser(description='Process some integers.')
    parser.add_argument('--conceptnet', required=True, type=str, help='Path to ConceptNet csv.')
    parser.add_argument('--top50000', required=False, type=str,
                        default='', help='Path to pickled vocabulary file containing most frequent 50000 words.')
    parser.add_argument('--language', required=False, type=str,
                        default='en', help='Language of assertions. Default: en')
    parser.add_argument('--thd', required=False, type=int, default=-1, help='Treshold for the frequency of concepts.')

    args = parser.parse_args()
    print("The command line arguments were ", args)
    pp = Preprocessor(args.conceptnet, args.language, args.top50000)
    print("Saving concept data...")
    pp.save_concept_data()
    print("Getting concept data...")
    concept_data, concept_data_with_rel, vocab = pp.get_Concept_Data()
    print(concept_data.i2c)
    print("Thresholding...")
    if args.thd != -1:
        t = Thresholder(args.thd, concept_data, pp.top_name)
        t.threshold()
    else:
        for thd in [0, 5, 10, 20, 30, 40]:
            t = Thresholder(thd, concept_data, pp.top_name)
            t.threshold()





if __name__ == "__main__":
    main()
