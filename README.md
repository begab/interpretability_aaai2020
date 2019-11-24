# interpretability_aaai2020
This repo contains the code used for the experiments of the [AAAI2020 paper](/#) titled `Understanding the semantic content of sparse word embeddings using a commonsense knowledge base`

# Abstract

Word embeddings have developed into a major NLP tool with broad applicability. Understanding the semantic content of word embeddings
remains an important challenge for additional applications. One aspect of this issue is to explore the interpretability of word embeddings.
Sparse word embeddings have been proposed as models with improved interpretability.
Continuing this line of research, we investigate the extent to which human interpretable semantic concepts emerge along the bases of sparse word representations.
In order to have a broad framework for evaluation, we consider three general approaches for constructing sparse word representations, which are then evaluated in multiple ways.
We propose a novel methodology to evaluate the semantic content of word embeddings using a commonsense knowledge base, applied here to the sparse case.
This methodology is illustrated by two techniques using the ConceptNet knowledge base. The first approach assigns a commonsense concept label to the individual dimensions of the embedding space. The second approach uses a metric, derived by spreading activation, to quantify the coherence of coordinates along the individual axes. We also provide results on the relationship between the two approaches.
The results show, for example, that in the individual dimensions of sparse word embeddings, words having high coefficients are more semantically related in terms of path lengths in the knowledge base than the ones having zero coefficients.

## Steps to reproduce our experiments



### Obtaining dense embeddings
The first step is to obtain dense embeddings for later analysis. You can either train either provide your in-house trained embeddings or use any of the pre-trained ones. We did the latter in our experiments in the paper, i.e. we analysed the pre-trained [Glove](https://nlp.stanford.edu/projects/glove/) embeddings. More precisely, our paper reports results based on the 300 dimensional [Glove-6B](http://nlp.stanford.edu/data/glove.6B.zip) vectors that were trained over 6 billion tokens originating from the corpora of Wikipedia 2014 and Gigaword 5.
## Requirements
Python 3.6
## Install
Install the latest code from GitHub.

    git clone https://github.com/begab/interpretability_aaai2020.git
    cd interpretability_aaai2020
    pip install -r requirements.txt

### Deriving sparse representations based on the dense embeddings

We relied on three different approaches for deriving sparse word representations in the paper. The approaches are dubbed as _DLSC_, _k-means_ and _GMPO_. For more details, please refer to the paper.

The sparse word representations that we computed can be accessed from [the following folder](http://www.inf.u-szeged.hu/~berendg/sparse_glove_extended/). Note that we created further embeddings besides the ones referenced in our article.

The file names have the following structure  
`glove{50,100,200,300}d_l_0.[1-5]_{DLSC,kmeans,GMPO}_top400000.emb.gz`.

## Preprocess sparse embedding and knowledge base
To preprocess a gzipped sparse embedding:
	
	cd src
	python preprocess/preprocess_sparse_embedding --embedding <path_to_gzipped_embedding>

This will result in an npz format embedding matrix and word index files in the `data` directory.
	
To preprocess a knowledge base (and its assertions) download the [assertion][1] files of the knowledge bases, then run:

	cd src
	python preprocess/preprocess_cnet --kb <path_to_json_assertion>
	
This will result in a pickled concept index files and word-concept dictionaries in the `data` directory.

## Assign knowledge base concepts to sparse embedding dimensions
Make sure the knowledge base (assertaions) and the sparse embedding are preprocessed.

	cd src
	
Filter the word embedding matrix to contain words that are also present in the vocabulary of the knowledge base:

	python sparse_alignments/filter_embedding.py --embedding <path_to_npz_embedding> --vocabulary <path_to_pickled_knowledge_base_vocabulary>

Then, generate a word-concept matrix:

	python sparse_alignments/word_concept_matrix.py --embedding <path_to_filtered_npz_embedding>
	
For the (TAB and TAC) evaluations split train and test sets for each concept:

	python sparse_alignments/train_test_split.py --embedding <path_to_filtred_npz_embedding>

Compute meta-concepts based on word-concept matrix:

	python sparse_alignments/meta_concepts.py --word-concept <path_to_word_concept_matrix>
	
Run the alignment based on NPPMI:
	
	python sparse_alignments/alignment_NPPMI.py --embedding <path_to_filtered_npz_embedding>

The results can be found in the `results\nppmi` folder. The alignment needed for evaluation will be at the `results\nppmi\max_concept\` folder.
	
## Evaluate alignments
Input pickled files are in the `results/nppmi/max_concepts` folder.

	python sparse_alignments/evaluation.py --alignment <path_to_pickled_alignment>

[1]: https://drive.google.com/open?id=1_gMhgPb2-O84WrZsR2ZnOh3bNVVsdrIQ	
