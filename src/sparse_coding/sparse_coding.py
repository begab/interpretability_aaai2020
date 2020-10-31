import re
import sys
import gzip
import spams
import argparse
import numpy as np

from zipfile import ZipFile
from collections import defaultdict, Counter
from scipy.sparse import csc_matrix, save_npz, load_npz

#import faiss # one could optionally use faiss for fast and potentially GPU-accelerated clustering
from sklearn.cluster import KMeans

def load_data(filename, max_words=-1, filter_words=None):
    if filename.endswith('.gz'):
        lines = gzip.open(filename, 'rt')
    elif filename.endswith('.zip'):
        myzip = ZipFile(filename) # we assume only one embedding file to be included in a zip file
        lines = myzip.open(myzip.namelist()[0])
    else:
        lines = open(filename)
    data, words = [], []
    for counter, line in enumerate(lines):
        if len(words) == max_words:
            break
        tokens = line.rstrip().split(' ')
        if len(words) == 0 and len(tokens) == 2 and re.match('[1-9][0-9]*', tokens[0]):
            # the first line might contain the number of embeddings and dimensionality of the vectors
            continue
        if filter_words is not None and not tokens[0] in filter_words:
            continue
        try:
            values = [float(i) for i in tokens[1:]]
            if sum([v**2 for v in values])  > 0: # only embeddings with non-zero norm are kept
                data.append(values)
                words.append(tokens[0])
        except:
            print('Error while parsing input line #{}: {}'.format(counter, line))
    i2w = dict(enumerate(words))
    w2i = defaultdict(lambda: -1, {v:k for k,v in i2w.items()})
    return np.array(data), w2i, i2w

def write_embeddings(i2w, embeddings, out_file_name):
    dim = embeddings.shape[0]
    with open(out_file_name, 'w') as f:
        for i in range(len(i2w)):
            f.write(i2w[i])
            c = embeddings.getcol(i)
            to_print = defaultdict(int, zip(c.indices, c.data))
            f.write(' {}\n'.format(' '.join(map(str, [round(to_print[j],8) for j in range(dim)]))))

def length_normalize_rows(embeddings):
    model_row_norms = np.sqrt((embeddings**2).sum(axis=1))[:, np.newaxis]
    return embeddings / model_row_norms

def length_normalize_columns(embeddings):
    model_col_norms = np.sqrt((embeddings**2).sum(axis=0))[np.newaxis,:]
    return embeddings / model_col_norms

def generate_dict(emb, K):
    emb = length_normalize_rows(emb)
    # fist_to_select = np.argmax(emb @ np.mean(emb, axis=0))
    fist_to_select = 0
    selected_rows = [fist_to_select]
    selected_embeddings = [emb[fist_to_select]]
    for i in range(K-1):
        if i%100==0:
            print(i, len(set(selected_rows)))
            sys.stdout.flush()
        embedding_to_add = np.argmin(np.max(np.abs(np.array(selected_embeddings) @ emb.T), axis=0))
        selected_rows.append(embedding_to_add)
        selected_embeddings.append(emb[embedding_to_add])
    return np.array(selected_embeddings).T, selected_rows


def main():
    parser = argparse.ArgumentParser(description="Performs sparse coding of dense word embeddings")
    parser.add_argument("dense_embeddings_location", help="location of the dense embeddings", type=str)
    parser.add_argument("sparse_output_file", help="location of the sparse outputs", type=str)
    parser.add_argument('K', help='determines the dimensionality of the output sparse embeddings', type=int)
    parser.add_argument('lda', help='the regularization coefficient controlling the sparsity of the embeddings', type=float)
    parser.add_argument('approach', help='one of DLSC/kmeans/GMPO', choices=['DLSC', 'kmeans', 'GMPO'])
    parser.add_argument('--top-words', help='how many dense embeddings to utilize [default is to use all of them]', type=int, default=-1)

    alphas_nonneg_parser = parser.add_mutually_exclusive_group(required=False)
    alphas_nonneg_parser.add_argument('--alphas_nonneg', dest='alphas_nonneg', action='store_true')
    alphas_nonneg_parser.add_argument('--alphas_any', dest='alphas_nonneg', action='store_false')
    parser.set_defaults(alphas_nonneg=True)
    norm_parser = parser.add_mutually_exclusive_group(required=False)
    norm_parser.add_argument('--norm', dest='normalize', action='store_true')
    norm_parser.add_argument('--no_norm', dest='normalize', action='store_false')
    parser.set_defaults(normalize=False)

    args = parser.parse_args()

    emb, _, i2w = load_data(args.dense_embeddings_location, args.top_words)
    if args.normalize:
        emb = length_normalize_rows(emb)
    dictionary_mode = sys.argv[3]  # DL/GS/kmeans
    top_words = emb.shape[0]  # the default is to use all words, a viable alternative to use top 50K instead for instance
    if top_words > args.top_words > 0:
        top_words = args.top_words


    param = {'K': args.K, 'lambda1': args.lda, 'numThreads': 8, 'batchsize': 400,
             'iter': 1000, 'verbose': False, 'posAlpha': args.alphas_nonneg}
    if args.approach == 'DLSC':
        D = spams.trainDL(emb[0:top_words].T, **param)
    elif args.approach == 'GMPO':
        D, selected_rows = generate_dict(emb[0:top_words], args.K)
        #print(dim, len(set(selected_rows)))
    elif args.approach == 'kmeans':
        #kmeans = faiss.Kmeans(emb.shape[1], args.K)
        #kmeans.train(emb[0:top_words].astype('float32'))
        #D_faiss = kmeans.centroids.T.astype('float64')
        kmeans = KMeans(n_clusters=args.K, random_state=0).fit(emb[0:top_words])
        #print(dim, Counter(kmeans.labels_).most_common(15))
        D = length_normalize_columns(kmeans.cluster_centers_).T


    l_param = {x:param[x] for x in ['L','lambda1','lambda2','mode','pos','ols','numThreads','length_path','verbose'] if x in param}
    l_param['pos'] = args.alphas_nonneg
    alphas = spams.lasso(emb.T, D=D, **l_param)
    write_embeddings(i2w, alphas, args.sparse_output_file)

if __name__ == "__main__":
    main()
