# interpretability_aaai2020
This repo contains the code based used for the experiments of the [AAAI2020 paper](/#) titled `Understanding the semantic content of sparse word embeddings using a commonsense knowledge base`

# Abstract

Word embeddings developed into a major NLP tool with broad applicability.
Understanding the semantic content of word embeddings remains an important challenge for additional applications. One aspect of this issue is to explore the interpretability of word embeddings.
Sparse word embeddings have been proposed as models with improved interpretability.
Continuing this line of research, we investigate the extent to which human interpretable semantic concepts emerge along the bases of sparse word representations.
In order to have a broad framework for evaluation, we consider three general approaches for constructing sparse word representations, which are then evaluated in multiple ways.
We propose a novel methodology to evaluate the semantic content of word embeddings using a commonsense knowledge base, applied here to the sparse case.
This methodology is illustrated by two techniques using the ConceptNet knowledge base.
The first approach assigns a commonsense concept label to the individual dimensions of the embedding space. The second approach uses a metric, derived by spreading activation, to quantify the coherence of coordinates along the individual axes. We also provide results on the relationship between the two approaches.
The results show, for example, that in the individual dimensions of sparse word embeddings, words having high coefficients are more semantically related in terms of path lengths in the knowledge base than the ones having zero coefficients.

## Steps to reproduce our experiments



### Obtaining dense embeddings

The first step is to obtain dense embeddings for later analysis. You can either train either provide your in-house trained embeddings or use any of the pre-trained ones. We did the latter in our experiments in the paper, i.e. we analysed the pre-trained [Glove](https://nlp.stanford.edu/projects/glove/) embeddings. More precisely, we our paper reports results based on the 300 dimensional [Glove-6B](http://nlp.stanford.edu/data/glove.6B.zip) vectors that were trained over 6 billion tokens originating from the corpora of Wikipedia 2014 and Gigaword 5.

### Deriving sparse representations based on the dense embeddings

We relied on three different approaches for deriving sparse word representations in the paper. The approaches are dubbed as _DLSC_, _k-means_ and _GMPO_. For more details, please refer to the paper.

The sparse word representations that we computed can be accessed from [the following folder](http://www.inf.u-szeged.hu/~berendg/sparse_glove_extended/). Note that we created further embeddings besides the ones referenced in our article.

The file names have the following structure  
`glove{50,100,200,300}d_l_0.[1-5]_{DLSC,kmeans,GMPO}_top400000.emb.gz`.
