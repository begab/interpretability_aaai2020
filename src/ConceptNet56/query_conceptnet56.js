/*
 * -----------------------------
 * 2019
 * April 3 -- May 21
 * -----------------------------
 */

/*****************************************************************************/
/*jshint esversion: 6 */
// jshint trailingcomma: false
// jshint undef:true
// jshint unused:true
/* jshint node:true */
/*****************************************************************************/

const fs        = require('fs');
const async     = require('async');
const assert    = require('assert-plus');
var MongoClient = require('mongodb').MongoClient;

/*****************************************************************************/

//var collection_to_query = 'conceptnet54';
const collection_to_query = 'conceptnet56';

/*****************************************************************************/

const all_datasets_56 = [
	'/d/cc_cedict', 		/* Chinese to English dictionary */
	'/d/dbpedia/en',
	'/d/wordnet/3.1',
	'/d/wiktionary/en',
	'/d/wiktionary/fr',
	'/d/wiktionary/de',
	'/d/jmdict', 			/* Japanese / multilingual dictionary data */
	'/d/conceptnet/4/ja',
	'/d/conceptnet/4/zh',
	'/d/conceptnet/4/pt',
	'/d/conceptnet/4/en',
	'/d/conceptnet/4/es',
	'/d/conceptnet/4/hu',
	'/d/conceptnet/4/nl',
	'/d/verbosity',
	'/d/emoji',
	'/d/conceptnet/4/fr',
	'/d/conceptnet/4/it',
	'/d/opencyc',
	'/d/conceptnet/4/ko'
];

/*****************************************************************************/

const en_datasets_56 = [
	'/d/dbpedia/en',
	'/d/wordnet/3.1',
	'/d/wiktionary/en',
	'/d/conceptnet/4/en',
	'/d/verbosity',
	'/d/emoji',
	'/d/opencyc'
];

/*****************************************************************************/

const only_conceptnet40_from_56 = ['/d/conceptnet/4/en'];

/*****************************************************************************/
/*****************************************************************************/
/*****************************************************************************/

const fname_glove    = "glove_words";
const fname_glove_ms = "glove_microsoft_words";

/*****************************************************************************/

const fname_graph_ms      = "graph_ms.txt";
const fname_graph_ms_no_s = "graph_ms_no_s.txt";

const fname_graph_no_s    = "graph_no_s.txt";

const fname_topK_glove_only_no_s = "topK.jsons";

const fname_topK         = "topK_ms.jsons";
const fname_topK_no_s    = "topK_ms_no_s.jsons";

const our_favorite_top_K = 50000;

const NUM_BASES          = 1000;
const TOP_BOT_THRESHOLD  = 10;   // we check that many words in each base, for the top and the bottom

const fname_top_bottom_with_s    = './Vanda_ms_top_bottom/top_bot_words.jsons';
const fname_top_bottom_without_s = './Vanda_ms_top_bottom/top_bot_words_no_s.jsons';
const fname_top_bottom_glove     = './Vanda_top_bottom/top_bot_words_glove.jsons';

const fname_top_bottom_glove_kmeans = './glove300d_l_0.5_kmeans_top400000.emb.gz/top_bot_words.jsons';
const fname_top_bottom_glove_gs     = './glove300d_l_0.5_GS_top400000.emb.gz/top_bot_words.jsons';
const fname_top_bottom_glove_dl     = './glove300d_l_0.5_DL_top400000.emb.gz/top_bot_words.jsons';

/*****************************************************************************/

const theProperties_allowing_s = ['start_no_s', 'start_a', 'start_n', 'start_r', 'start_v', 
				'start_append_s_vanilla', 'start_append_s_a', 'start_append_s_n', 'start_append_s_r', 'start_append_s_v',
				'end_no_s', 'end_a', 'end_n', 'end_r', 'end_v', 
				'end_append_s_vanilla', 'end_append_s_a', 'end_append_s_n', 'end_append_s_r', 'end_append_s_v'];

const theProperties_no_s = ['start_no_s', 'start_a', 'start_n', 'start_r', 'start_v', 'end_no_s', 'end_a', 'end_n', 'end_r', 'end_v'];

const theProperties = theProperties_no_s;
if (theProperties.length === 10) {
	console.log(' * Working with properties corresponding to the case of NO MANIPULATION OF SERIAL S *');
} else {
	console.log(' * Working with properties corresponding to the case of MANIPULATION OF SERIAL S *');
}

/*****************************************************************************/

const dummy_graph_property_for_hacking = "_____project_and_graph_info_____";

const g_default_init_weight = 0.1;
const g_decay_factor        = 0.01000;
const g_firing_threshold    = 0.00001;
const g_refire_constant     = 1;
const g_max_spreading_activation_iters = 20;

//var SPREADING_ACTIVATION_ERROR_CODES = [null, 1]; // null: indicates that at least one path exists; 1: indicates that we reached max number of iterations

/*****************************************************************************/

MongoClient.connect("mongodb://localhost:27017/", { useNewUrlParser: true }, function(init_err, db) {
	if (init_err) throw init_err;
	var dbo = db.db("conceptnet");

	/*
	 * Determine which words appear in ConceptNet 5.6
	 * among the ones that Vanda has collected.
	 */

	/*****************************************************************/

	/*
	lets_rock(dbo, function (err) {
		if (err) throw err;
		db.close();
	});*/

	/*****************************************************************/

	/*
	select_top_K_words (dbo, fname_graph_no_s *//*fname_graph_ms_no_s*//*, our_favorite_top_K, function (err, topK) {
	//select_top_K_words (dbo, fname_graph_ms, our_favorite_top_K, function (err, topK) {
		//if (err) throw err;
		assert.ok (err === null);
		assert.ok (our_favorite_top_K <= topK.length, 'topK.length: ' + topK.length);

		// Write them down on a file, one by one.
		var i;
		var output = "";
		for (i = 0; i < our_favorite_top_K; i++) {
			output += "" + JSON.stringify(topK[i]) + "\n";
			//console.log("" + i + ": " + JSON.stringify(topK[i]));
		}
		var file_options = {encoding: 'utf8', *//*mode: 0o666,*//* flag: 'w'};
		fs.writeFile(fname_topK_glove_only_no_s *//*fname_topK_no_s*//*, output, file_options, function (write_error) {
		//fs.writeFile(fname_topK, output, file_options, function (write_error) {
			assert.ok(write_error === null);
			db.close();
		});
	});*/

	/*****************************************************************/

	/*
	load_top_words_and_perform_spreading_activation_tests (dbo, fname_topK, function (err, sol) {
		assert.ok(err === null);

		//console.log('Data');
		//console.log(JSON.stringify(data, null, 3));
		//console.log('size: ' + data.length);

		db.close();
	});
	*/

	/*****************************************************************/

	/**/
	load_top_bottom_words_and_perform_spreading_activation_tests_no_s(dbo, fname_top_bottom_glove_kmeans, function (err) {
		if (err) throw err;

		db.close();
	});/**/
});

/*****************************************************************************/
/*****************************************************************************/
/*****************************************************************************/

function load_top_bottom_words_and_perform_spreading_activation_tests_no_s (db_object, fname, callback) {
	console.log(" * Loading file " + fname + "\n");
	fs.readFile(fname, {encoding: 'utf8', flag: 'r'}, function (err_read, data_read) {
		assert.ok(err_read === null);

		var i, j, current_base_index;
		var bases_as_strings = data_read.split('\n');
		assert.ok(NUM_BASES === bases_as_strings.length, 'num bases: ' + NUM_BASES + ', len: ' + bases_as_strings.length);
		
		var base_info = [];
		var current_object; 
		for (i = 0; i < NUM_BASES; i++) {
			current_object = JSON.parse(bases_as_strings[i]);
			assert.ok(current_object.base_id === i); // so that base ids are index in the correct index in the array
			base_info.push(current_object);
			//console.log(JSON.stringify(current_object, null, 3));
		}

		//var difficult_base_indices_dl = [32, 81, 115, 134, 241, 274 /* looks like having very good alignment but berlusconni and brescia need many many points*/, 303 /*probably the worst case ever; top(0,8) needs neighbors of 1,480,118 concepts */, 312, 318, 338, 429, 517, 633, 838, 862, 867, 874, 925, 933, 987];
		//var difficult_base_indices_gs = [57, 92, 188, 192, 234, 334, 431, 489, 493, 651, 656, 687, 698, 718, 884, 934];
		var difficult_base_indices_kmeans = [32 /*undef*/, 96, 125, 158, 186 /*undef*/, 290, 352 /*undef*/, 375, 407, 411, 613 /*undef*/, 615 /* top(0, 4) did not meet */, 622, 677, 762, 790, 799, 872, 953, 971 /*undef*/, 978 /*long path and too many neighbors*/, 987];
		//var difficult_base_indices_first_time = [56, 73, 81, 200 /* no output */, 262, 274, 350, 425/* spreading activation values */, 457, 517, 623, 770 /* undefined */, 776];
		var base_indices = [];
		for (i = 975; i < 1000; i++) {
			var containment = difficult_base_indices_kmeans.includes(i);
			if (containment === false) {
				base_indices.push(i);
			}
		}
		
		var start_time = process.hrtime();
		compute_heavy_paths_for_particular_bases(db_object, base_info, base_indices, function (err_comp, res_comp) {
			console.log("\n\n ======================================== DONE ========================================\n");


/*
			// write the results to a file and maintain the form that Vanda gave us for each entry:
			// base_id: ..., top_words: [...], bot_words: [...], 
			//
			// and extend with:
			// top_sols: [{i1: 0, i2: 1, sol: {path: [...], weight: ...}}], 
			// as well as with
			// bot_sols: [{i1: 0, i2: 1, sol: {path: [...], weight: ...}}]
			// 
			// Once we are done, store the information in a new file
			//var the_solution = [];
			//assert.ok(res_comp.length === base_indices.length, 'base_indices.length: ' + base_indices.length + ', res_comp.length: ' + res_comp.length + '\n\nbase_indices: ' + JSON.stringify(base_indices) + '\n\nres_comp:\n' + JSON.stringify(res_comp, null, 0));
			for (i = 0; i < base_indices.length; i++) {
				current_base_index = base_indices[i];
				current_object     = JSON.parse( JSON.stringify(base_info[current_base_index]) );

				// Add solutions for bottom
				current_object.bot_sols = [];
				assert.ok(res_comp[i][0][0].base_id === current_object.base_id); // make sure that we are indeed doing what we expect
				assert.ok(res_comp[i][0][0].kind    === 'bot_words');
				for (j = 0; j < res_comp[i][0].length; j++) {
					current_object.bot_sols.push({
						'i1': res_comp[i][0][j].i1,
						'i2': res_comp[i][0][j].i2,
						'sol': res_comp[i][0][j].sol
					});
				}

				// Add solutions for top
				current_object.bot_sols = [];
				assert.ok(res_comp[i][1][0].base_id === current_object.base_id); // make sure that we are indeed doing what we expect
				assert.ok(res_comp[i][1][0].kind    === 'top_words');
				for (j = 0; j < res_comp[i][1].length; j++) {
					current_object.bot_sols.push({
						'i1': res_comp[i][1][j].i1,
						'i2': res_comp[i][1][j].i2,
						'sol': res_comp[i][1][j].sol
					});
				}

				// Append the solution for this requested base to the list of solutions that we have
				the_solution.push(current_object);
			}
*/
			/*
			 * Now write a file with the results of one base per line
			 */
/*
			var my_text = "";
			for (i = 0; i < the_solution.length; i++) {
				my_text += "" + JSON.stringify(the_solution[i]) + "\n";
			}

			var target_filename = "bases_950_999.jsons";
			fs.writeFile(target_filename, my_text, 'utf8', function (write_error) {
				assert.ok(write_error === null);
				console.log('Created a file named ' + target_filename + ' with our solutions\n');


				var now_time = process.hrtime(start_time);
				var duration = [];
				duration.push(now_time[0]);
				duration.push(now_time[1] / 1000000);
				console.log(">>> total time elapsed for these bases: " + get_time_elapsed_as_string(duration));

				return callback(write_error);
			});
*/

			return callback(null);
		});
	});
}

/*****************************************************************************/

function compute_heavy_paths_for_particular_bases (db_object, base_info, rem_bases_of_interest, callback) {
	assert.ok(rem_bases_of_interest.length > 0);

	var i;
	var current_base_index = rem_bases_of_interest[0];
	var bases_to_propagate = rem_bases_of_interest.slice(1); // can be empty

	// target file name for this base
	var target_filename = "./results/" + "base_" + current_base_index + ".json";

	fs.access(target_filename, fs.F_OK, function (file_exists_error) {
		//console.log("Error received: " + file_exists_error);
		if (file_exists_error === null) {
			console.log("  Skipping computations for base " + current_base_index + "; the file " + target_filename + " already exists!\n");
			compute_heavy_paths_for_particular_bases(db_object, base_info, bases_to_propagate, function (err, res_for_other_bases) {
				assert.ok(err === null);
				return callback(null, res_for_other_bases);
			});
		} else {
			recursively_compute_heavy_paths_for_particular_base_using_spreading_activation(db_object, 
				base_info, current_base_index, function (err_base, res_for_current_base) {
				assert.ok(err_base === null);
				assert.ok(res_for_current_base.length == 2, 'res_for_current_base: ' + JSON.stringify(res_for_current_base));
				
				fs.writeFile(target_filename, JSON.stringify(res_for_current_base), 'utf8', function (write_error) {
					if (write_error) throw write_error;
					assert.ok(write_error === null);
					console.log(' **** Created a file named ' + target_filename + ' with the results for base ' + current_base_index);
					console.log('base ' + current_base_index + ' ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

					// Continue with the recursion
					if (bases_to_propagate.length === 0) {
						// end of recursion
						assert.ok(res_for_current_base.length == 2, 'res_for_current_base: ' + JSON.stringify(res_for_current_base));
						return callback(null, [res_for_current_base]); 	// it is important to return the singleton list for correct concatenation
					} else {
						compute_heavy_paths_for_particular_bases(db_object, base_info, bases_to_propagate, function (err, res_for_other_bases) {
							assert.ok(err === null);

							var all_results = [];
							//console.log("inside: " + JSON.stringify(res_for_current_base));
							//console.log("inside: " + JSON.stringify(res_for_other_bases));
							all_results.push(res_for_current_base);
							//console.log("inside: " + JSON.stringify(all_results));
							//console.log("length: " + res_for_other_bases.length);
							for (i = 0; i < res_for_other_bases.length; i++) {
								assert.ok(res_for_other_bases[i].length === 2);

								all_results.push(res_for_other_bases[i]);
							}

							return callback(null, all_results);
						});
					}
				});
			});
		}
	});
}

/*****************************************************************************/

function recursively_compute_heavy_paths_for_particular_base_using_spreading_activation (db_object, base_info, some_base, callback) {

	var bot_sols = [];
	var top_sols = [];
	var bot_sum_lengths = 0;
	var top_sum_lengths = 0;
	var i;

	// keep track of time
	var begin_time = process.hrtime();
	var begin_top_time;
	var now_time; // = process.hrtime(time_started);
	var duration;

	console.log("base " + some_base + " vvvvvvvvvvvvvvvvvv beginning of computation for base vvvvvvvvvvvvvvvvvv");
	recursively_compute_heavy_paths_for_particular_base_and_property_using_spreading_activation_for_Vanda_files(db_object, 
		base_info, some_base, "bot_words", 0, 1, bot_sols, function (err_bot) {
		assert.ok(err_bot === null);

		for (i = 0; i < bot_sols.length; i++) {
			// [{"kind":"top_words","i1":0,"i2":1,"sol":{"path":["/c/en/goalkeeper","/c/en/keeper"],"weight":0.20600000000000002}},{"kind":"top_words","i1":0,"i2":2,"sol":{"path":["/c/en/goalkeeper","/c/en/goalie"],"weight":0.20500000000000002}}, ...]
			bot_sum_lengths += bot_sols[i].sol.path.length - 1;
		}
		console.log("--- base " + some_base + ", bot_words: length sum is " + bot_sum_lengths + " for " + bot_sols.length + " pairs -- avg length is " + ((1.0 * bot_sum_lengths)/bot_sols.length).toFixed(3));
		now_time = process.hrtime(begin_time);
		duration = [];
		duration.push(now_time[0]);
		duration.push(now_time[1] / 1000000);
		begin_top_time = process.hrtime();
		console.log(">>> base " + some_base + " bot time elapsed: " + get_time_elapsed_as_string(duration));
		

		console.log("base " + some_base + " -------------------- switching from bottom to top ---------------------");
		recursively_compute_heavy_paths_for_particular_base_and_property_using_spreading_activation_for_Vanda_files(db_object, 
			base_info, some_base, "top_words", 0, 1, top_sols, function (err_top) {
			assert.ok(err_top === null);

			for (i = 0; i < top_sols.length; i++) {
				// [{"kind":"top_words","i1":0,"i2":1,"sol":{"path":["/c/en/goalkeeper","/c/en/keeper"],"weight":0.20600000000000002}},{"kind":"top_words","i1":0,"i2":2,"sol":{"path":["/c/en/goalkeeper","/c/en/goalie"],"weight":0.20500000000000002}}, ...]
				top_sum_lengths += top_sols[i].sol.path.length - 1;
			}
			console.log("--- base " + some_base + ", top_words: length sum is " + top_sum_lengths + " for " + top_sols.length + " pairs -- avg length is " + ((1.0 * top_sum_lengths)/top_sols.length).toFixed(3));			
			now_time = process.hrtime(begin_top_time);
			duration = [];
			duration.push(now_time[0]);
			duration.push(now_time[1] / 1000000);
			console.log(">>> base " + some_base + " top time elapsed: " + get_time_elapsed_as_string(duration));
			

			console.log("base " + some_base + " ^^^^^^^^^^^^^^^^^^^^^ end of computation for base ^^^^^^^^^^^^^^^^^^^^^");
			now_time = process.hrtime(begin_time);
			duration = [];
			duration.push(now_time[0]);
			duration.push(now_time[1] / 1000000);
			console.log(">>> base " + some_base + " total time elapsed: " + get_time_elapsed_as_string(duration));
			console.log("base " + some_base + " ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");

			var results_for_this_base = [];
			results_for_this_base.push(bot_sols);
			results_for_this_base.push(top_sols);
			assert.ok (results_for_this_base.length === 2);
			return callback(null, results_for_this_base);
		});
	});
}

/*****************************************************************************/

function recursively_compute_heavy_paths_for_particular_base_and_property_using_spreading_activation_for_Vanda_files (db_object, 
	base_info, base_index, property_to_check, index_1, index_2, partial_solution, callback) {

	if ( (index_1 === TOP_BOT_THRESHOLD - 1) ) {
		assert.ok(index_2 === TOP_BOT_THRESHOLD);
		return callback(null); // we are done with the computation
	} else if (index_2 === TOP_BOT_THRESHOLD) {
		recursively_compute_heavy_paths_for_particular_base_and_property_using_spreading_activation_for_Vanda_files(db_object, 
			base_info, base_index, property_to_check, index_1 + 1, /* index_2 */ index_1 + 2, partial_solution, function (err_below) {
			
			return callback(err_below);
		});
	} else if (index_1 === index_2) {
		// skip main diagonal entries
		recursively_compute_heavy_paths_for_particular_base_and_property_using_spreading_activation_for_Vanda_files(db_object, 
			base_info, base_index, property_to_check, index_1, index_2 + 1, partial_solution, function (err_below) {
			
			return callback(err_below);
		});
	} else {
		var concept_1 = base_info[base_index][property_to_check][index_1];
		var concept_2 = base_info[base_index][property_to_check][index_2];

		var normal_concept_1 = standardize_concept( concept_1 );
		var normal_concept_2 = standardize_concept( concept_2 );
		console.log("======================================================================================================");
		console.log("Will now compute solution for: " + normal_concept_1 + " and " + normal_concept_2);

		activate_network_using_two_starting_concepts(db_object, normal_concept_1, index_1, normal_concept_2, index_2, function (err_act, solution_received, num_concepts_raised) {
			//assert.ok(err_act === null);
			//console.log("======================================================================================================");
			//console.log("  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  ");
			//console.log("  Network was activated using concepts '" + normal_concept_1 + "' (" + index_1 + ") and '" + normal_concept_2 + "' (" + index_2 + ")");
			if (err_act !== null) {
				console.log("  Error code received: " + err_act + " c1: " + normal_concept_1 + ", c2: " + normal_concept_2);
				console.log("======================================================================================================");
				return (err_act); 	// stopping work abruptly here ... :S
			} else {
				partial_solution.push({
					'base_id': base_index,
					'kind': property_to_check,
					'i1': index_1, 
					'i2': index_2,
					'sol': solution_received,
					'num_concepts_raised': num_concepts_raised
				});
				//console.log("  Found heavy short path of length " + (solution_received.path.length - 1) + " with total activation along the path: " + solution_received.weight );
				//console.log("  " + JSON.stringify(solution_received.path));
				//console.log("  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
				console.log("base " + base_index + ": " + property_to_check + " (" + index_1 + ", " + index_2 + ") raised " + num_concepts_raised + " concepts and found path w/ activation " + (solution_received.weight).toFixed(6) + " and length " + (solution_received.path.length - 1) + ": " + JSON.stringify(solution_received.path) );

				recursively_compute_heavy_paths_for_particular_base_and_property_using_spreading_activation_for_Vanda_files(db_object, 
					base_info, base_index, property_to_check, index_1, index_2 + 1, partial_solution, function (err_rec) {
					if (err_rec === null) 	return callback(null);
					else 					return callback(err_rec);
				});
			}			
		});
	}
}


/*****************************************************************************/

function load_top_words_and_perform_spreading_activation_tests(db_object, filename_topK, callback) {
	fs.readFile(filename_topK, {encoding: 'utf8', flag: 'r'}, function (err1, data1) {
		assert.ok(err1 === null);
 
		var concepts_list  = data1.split('\n');
		//console.log(concepts_list.length);
		var concepts_array = [];
		var i, j;
		for (i = 0; i < concepts_list.length; i++) {
			concepts_array.push(JSON.parse(concepts_list[i]));
		}
		//console.log (concepts_list);
		//console.log(concepts_array.length);
		var number_of_concepts = concepts_array.length;
		console.log("Loaded " + number_of_concepts + " concepts");
		concepts_list.length = 0; // delete the text info that we read

		var index_1 = 0; //12345;
		var index_2 = 1; //43210;
		assert.ok(index_1 !== index_2);

		var computed_solutions = [];
		//computed_solutions.dummy_graph_property_for_hacking = "this is here so that we can pass the variable by reference";

		//var tics_index_1 = [0, 25, 100, 500, 1000, 5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000, 49998];
		//var tics_index_2 = [1, 50, 250, 750, 2000, 5001, 10001, 15001, 20001, 25001, 30001, 35001, 40001, 45001, 49999];
		var tics_index_1 = [100, 250, 500, 750, 1000, 2500, 5000, 7500, 10000, 12500, 15000, 17500, 20000, 22500, 25000, 27500, 30000, 32500, 35000, 37500, 40000, 42500, 45000, 47500, 49998];
		var tics_index_2 = [101, 251, 501, 751, 1001, 2501, 5001, 7501, 10001, 12501, 15001, 17501, 20001, 22501, 25001, 27501, 30001, 32501, 35001, 37501, 40001, 42501, 45001, 47501, 49999];
		var tics_pairs   = [];
		for (i = 0; i < tics_index_1.length; i++) {
			for (j = 0; j < tics_index_2.length; j++) {
				tics_pairs.push({'i1': tics_index_1[i], 'i2': tics_index_2[j]});
			}
		}

		compute_heavy_paths_using_spreading_activation(db_object, concepts_array, tics_pairs, computed_solutions, function (err) {
			assert.ok(err === null);

			//console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
			//console.log(JSON.stringify(computed_solutions));
			//console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
			create_heatmap_file(computed_solutions, function (err_write, data_write) {
				return callback(err_write, data_write);
			});
		});
	});
}

/*****************************************************************************/

function create_heatmap_file (computed_solutions, callback) {
	var i;
	var contents = "";

	//console.log("+++++++++++++++++++++++++++++++++++++++++++++++++");
	//console.log(JSON.stringify(computed_solutions));
	//console.log("+++++++++++++++++++++++++++++++++++++++++++++++++");
	for (i = 0; i < computed_solutions.length; i++) {
		var current_entry = computed_solutions[i];
		//console.log("Processing current entry: " + JSON.stringify(current_entry));
		if (current_entry.i2 === 0) {
			contents += "\n";	// need an extra newline here so that we have x's in blocks
		}
		contents += "" + current_entry.i1 + " " + current_entry.i2 + " " + (current_entry.sol.path.length - 1) + "\n";
	}

	fs.writeFile('heatmap_data.txt', contents, 'utf8', function (err) {
		assert.ok(err === null);
		console.log('Created a file for our heatmap data');

		callback(err);
	});
}

/*****************************************************************************/

function compute_heavy_paths_using_spreading_activation (db_object, concepts_array, tics_pairs, computed_solutions, callback) {
	//assert.ok((index_1 >= 0) && (index_1 <= size - 1));
	//assert.ok((index_2 >= 0) && (index_2 <= size - 1));
	//assert.ok(index_1 !== index_2);

	if (tics_pairs.length === 0) {
		// we are done with the computation; just return
		return callback(null);
	}
	else {
		var current_pair = tics_pairs[0];
		var index_1      = current_pair.i1;
		var index_2      = current_pair.i2;
		var rest_tics_pairs = tics_pairs.slice(1);

		var c1      = standardize_concept( concepts_array[index_1].word );
		var c2      = standardize_concept( concepts_array[index_2].word );
		console.log("======================================================================================================");
		console.log("Will now compute solution for: " + c1 + " and " + c2);

		activate_network_using_two_starting_concepts(db_object, c1, index_1, c2, index_2, function (err_act, solution_received) {
			//assert.ok(err_act === null);
			//console.log("======================================================================================================");
			console.log("  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  ");
			console.log("  Network was activated using concepts '" + c1 + "' (" + index_1 + ") and '" + c2 + "' (" + index_2 + ")");
			if (err_act !== null) {
				console.log("  Error code received: " + err_act + " c1: " + c1 + ", c2: " + c2);
				console.log("======================================================================================================");
				return (err_act); 	// stopping work abruptly here ... :S
			} else {
				computed_solutions.push({
					'i1': index_1,
					'i2': index_2,
					'sol': solution_received
				});
				console.log("  Found heavy short path of length " + (solution_received.path.length - 1) + " with total activation along the path: " + solution_received.weight );
				console.log("  " + JSON.stringify(solution_received.path));
				console.log("  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
				console.log("(" + index_1 + ", " + index_2 + ") w/ length " + (solution_received.path.length - 1) + ": " + JSON.stringify(solution_received.path));

				compute_heavy_paths_using_spreading_activation(db_object, concepts_array, rest_tics_pairs, computed_solutions, function (err_rec) {
					if (err_rec === null) 	return callback(null);
					else 					return callback(err_rec);
				});
			}			
		});
	}
}

/*****************************************************************************/

function augment_subgraph_by_including_new_concept (aSubgraph, aConcept, someLabels) {
	assert.ok(aSubgraph.hasOwnProperty(aConcept) === false);
	assert.ok(standardize_concept(aConcept) === aConcept);

	var i;

	aSubgraph[aConcept] = {};
	aSubgraph[aConcept].spreadingWeight          = 0.0;
	aSubgraph[aConcept].requestFireNode          = false;
	aSubgraph[aConcept].requestFireNodeNextRound = false;
	aSubgraph[aConcept].timesFired               = 0;
	aSubgraph[aConcept].labels                   = [];
	aSubgraph[aConcept].neighbors                = {};
	// info to find path
	aSubgraph[aConcept].distance_from_concept1   = -1; // indicating infinity
	aSubgraph[aConcept].d_from_c1_obtained_by    = []; // empty list
	aSubgraph[aConcept].distance_from_concept2   = -1; // indicating infinity
	aSubgraph[aConcept].d_from_c2_obtained_by    = []; // empty list
	// another helpful bit of information
	aSubgraph[aConcept].is_meeting_node          = false;
	//
	aSubgraph[aConcept].tempWeight               = 0.0;
	aSubgraph[aConcept].tempLabels               = [];
	aSubgraph[dummy_graph_property_for_hacking].concepts_raised += 1;

	for (i = 0; i < someLabels.length; i++) {
		aSubgraph[aConcept].labels.push(someLabels[i]);
		aSubgraph[aConcept].tempLabels.push(someLabels[i]);
	}

	return aSubgraph;
}

/*****************************************************************************/

function activate_network_using_two_starting_concepts (db_object, concept1, index1, concept2, index2, callback) {
	assert.ok(index1 !== index2);
	// the indices will be used as labels that propagate through the nodes
	var i, k, number_of_concepts_raised;

	if (standardize_concept(concept1) === standardize_concept(concept2)) {
		// In these situations there is nothing to compute, this is the same concept 
		// so we need to return a path of length 0
		return callback(null, {
			'path': [standardize_concept(concept1)],
			'weight': g_default_init_weight
		});
	} else {

		var subgraph_of_interest = {};
		subgraph_of_interest[dummy_graph_property_for_hacking] = {};
		subgraph_of_interest[dummy_graph_property_for_hacking]._text = "Spreading activation to the rescue"; // just a hack for the object that is passed
		subgraph_of_interest[dummy_graph_property_for_hacking]._iteration = 0;
		subgraph_of_interest[dummy_graph_property_for_hacking].concepts_raised = 0;
		//
		subgraph_of_interest = augment_subgraph_by_including_new_concept(subgraph_of_interest, concept1, [index1]);
		subgraph_of_interest = augment_subgraph_by_including_new_concept(subgraph_of_interest, concept2, [index2]);
		// we want these two concepts to fire in the next round
		subgraph_of_interest[concept1].requestFireNode = true;
		subgraph_of_interest[concept2].requestFireNode = true;
		// Initialize distances
		subgraph_of_interest[concept1].distance_from_concept1 = 0;
		subgraph_of_interest[concept1].d_from_c1_obtained_by  = [concept1];
		//
		subgraph_of_interest[concept2].distance_from_concept2 = 0;
		subgraph_of_interest[concept2].d_from_c2_obtained_by  = [concept2];
		//
		// initialize the weights with spreading activation
		subgraph_of_interest[concept1].spreadingWeight = g_default_init_weight;
		subgraph_of_interest[concept2].spreadingWeight = g_default_init_weight;
		//console.log(JSON.stringify(subgraph_of_interest, null, 3));


		var initial_concept_array = [];
		initial_concept_array.push(concept1);
		initial_concept_array.push(concept2);

		spread_activation (db_object, 1, subgraph_of_interest, initial_concept_array, function (err_spread) {
			//assert.ok(err_spread === null);

			if (err_spread === null) {
				// we have indeed found at least one solution!
				// Go ahead and give some information to the user

				// Go once through the activated nodes to identify which ones are meeting points
				var our_meeting_nodes = [];
				var the_distance      = g_max_spreading_activation_iters + 1;
				var theKeys = Object.keys(subgraph_of_interest);
				for (k of theKeys) {
					if (k !== dummy_graph_property_for_hacking) {
						if (subgraph_of_interest[k].is_meeting_node === true) {
							var d1 = subgraph_of_interest[k].distance_from_concept1;
							var d2 = subgraph_of_interest[k].distance_from_concept2;
							var total_d = d1 + d2;
							if (total_d < the_distance) {
								the_distance      = total_d;
								our_meeting_nodes = [];
								our_meeting_nodes.push({
									'concept': k, 
									'distance_to_c1': d1,
									'distance_to_c2': d2,
									'total_distance': total_d
								});
							} else if (total_d === the_distance) {
								our_meeting_nodes.push({
									'concept': k,
									'distance_to_c1': d1,
									'distance_to_c2': d2,
									'total_distance': total_d
								});
							} // otherwise do nothing; we are interested in the shortest distance first; and largest activation second
						}
					}
				}

				// Now we have all the meeting nodes that are in shortest sum of distances from the two given nodes
				// Find greedily some path of heavy activations
				var some_path;
				var our_heavy_short_paths = [];
				for (i = 0; i < our_meeting_nodes.length; i++) {
					some_path = find_heavy_path (subgraph_of_interest, our_meeting_nodes[i], concept1, index1, concept2, index2);
					our_heavy_short_paths.push( JSON.parse( JSON.stringify(some_path) ) );
				}

				// Finally, iterate through the paths that were found above 
				// And pick the one with the largest total sum of activations along the way
				// Return that to the user
				var final_choice_index    = 0;
				var activation_along_path = our_heavy_short_paths[final_choice_index].weight;
				for (i = 0; i < our_heavy_short_paths.length; i++) {
					if (our_heavy_short_paths[i].weight > activation_along_path) {
						activation_along_path = our_heavy_short_paths[i].weight;
						final_choice_index    = i;
					}
				}

				// Right before we free up memory we need to iterate through all the neighbors
				// and artificially add them into the graph so that we can get a count of how many different concepts we had to raise
				// Right before we free up memory we store how many concepts we have raised
				number_of_concepts_raised = subgraph_of_interest[dummy_graph_property_for_hacking].concepts_raised;
				//
				subgraph_of_interest = {}; // free up memory
				//console.log(">>>>>>>>>>>>>>>>>>      just checking: " + JSON.stringify(our_heavy_short_paths[final_choice_index]));
				return callback(err_spread, our_heavy_short_paths[final_choice_index], number_of_concepts_raised);
			} else {
				// We did not find a single node that was reached by both labels
				// while spreading activation up to the user selected upper bound on the number of rounds
				assert.ok(err_spread === 1);
				console.log(" * We did not find a meeting point in " + g_max_spreading_activation_iters + " iterations of spreading activation.");
				number_of_concepts_raised = subgraph_of_interest[dummy_graph_property_for_hacking].concepts_raised;
				console.log(" * Number of concepts raised: " + number_of_concepts_raised);
				console.log(" * Returning with error code 1.");
				subgraph_of_interest = {}; // free up memory
				return callback(err_spread, {}, number_of_concepts_raised);
			}
		});
	}
}

/*****************************************************************************/

function find_heavy_path (aSubgraph, meeting_point, c1, i1, c2, i2) {
	assert.ok(i1 !== i2); // suppressing a jshint warning for now; we may need the labels in the future

	var distance_to_c1 = meeting_point.distance_to_c1;
	var distance_to_c2 = meeting_point.distance_to_c2;
	//var total_distance = meeting_point.total_distance;


	// First find a heavy path from the meeting_point to c1
	var current_node     = meeting_point.concept;
	var current_distance = distance_to_c1;
	var i, max, predecessors, next_node;
	var path_meet_to_c1  = [];
	path_meet_to_c1.push(current_node);

	while (current_node !== c1) {
		assert.ok(current_distance > 0);

		predecessors = [];
		predecessors = aSubgraph[current_node].d_from_c1_obtained_by;
		assert.ok(predecessors.length > 0);
		next_node    = predecessors[0];
		max          = aSubgraph[next_node].spreadingWeight;
		for (i = 1; i < predecessors.length; i++) {
			if (aSubgraph[predecessors[i]].spreadingWeight > max) {
				next_node = predecessors[i];
				max       = aSubgraph[next_node].spreadingWeight;
			}
		}

		// now we have selected a node for our path
		current_node     = next_node;
		path_meet_to_c1.push(current_node);
		current_distance = aSubgraph[current_node].distance_from_concept1;
	}
	var path_c1_to_meet = [];
	for (i = path_meet_to_c1.length - 1; i >= 0; i--) {
		path_c1_to_meet.push(path_meet_to_c1[i]);
	}

	// Now find a heavy path from the meeting point to c2
	current_node     = meeting_point.concept;
	current_distance = distance_to_c2;
	var path_meet_to_c2 = [];
	path_meet_to_c2.push(current_node);

	while (current_node !== c2) {
		assert.ok(current_distance > 0);

		predecessors = [];
		predecessors = aSubgraph[current_node].d_from_c2_obtained_by;
		assert.ok(predecessors.length > 0);
		next_node    = predecessors[0];
		max          = aSubgraph[next_node].spreadingWeight;
		for (i = 1; i < predecessors.length; i++) {
			if (aSubgraph[predecessors[i]].spreadingWeight > max) {
				next_node = predecessors[i];
				max       = aSubgraph[next_node].spreadingWeight;
			}
		}

		// now we have selected a node for our path
		current_node     = next_node;
		path_meet_to_c2.push(current_node);
		current_distance = aSubgraph[current_node].distance_from_concept2;
	}

	var path_found  = [];
	var path_weight = 0.0;
	for (i = 0; i < path_c1_to_meet.length; i++) {
		path_found.push(path_c1_to_meet[i]);
		path_weight += aSubgraph[path_c1_to_meet[i]].spreadingWeight;
	}
	// bypass the meeting point since it appears in both lists
	for (i = 1; i < path_meet_to_c2.length; i++) {
		path_found.push(path_meet_to_c2[i]);
		path_weight += aSubgraph[path_meet_to_c2[i]].spreadingWeight;
	}

	var response = {
		'path': path_found,
		'weight': path_weight
	};

	return response;
}

/*****************************************************************************/

function spread_activation (db_object, current_iteration, current_graph_state, array_of_concepts, callback) {
	var i, j, k, l, m, theKeys, found, met_at_a_node;
	var d1, d2, some_value;

	//var neighbors_so_far = [];
	console.log('  Round (' + current_iteration + ') of spreading activation and need neighbors of ' + array_of_concepts.length + ' concepts');
	gather_all_neighbors_for_this_round (db_object, current_graph_state, array_of_concepts, /*neighbors_so_far,*/ function(err) {
		assert.ok(err === null);

		/*
		 * We have gathered all the neighbors
		 *
		 * Now prepare all nodes for propagating activation
		 */
		theKeys = Object.keys(current_graph_state);
		//console.log(theKeys);
		//console.log(theKeys[0]);
		for (k of theKeys) {
			if ((k !== dummy_graph_property_for_hacking) /*&& (current_graph_state[k].requestFireNode === true)*/) {
				// We want to fire this node in this round
				//console.log(k);
				//console.log(current_graph_state[k]);
				current_graph_state[k].tempWeight = current_graph_state[k].spreadingWeight;
				current_graph_state[k].tempLabels = [];
				for (i = 0; i < current_graph_state[k].labels.length; i++) {
					current_graph_state[k].tempLabels.push(current_graph_state[k].labels[i]);
				}
			}
		}

		/*
		 * Initializations for this round have been done
		 * Go ahead and push labels and activation values
		 */
		met_at_a_node = false;
		for (k of theKeys) {
			if ((k !== dummy_graph_property_for_hacking) && 
				(current_graph_state[k].requestFireNode === true) &&
				(current_graph_state[k].timesFired <= g_refire_constant) ) {
				// This node should fire!
				for (i = 0; i < theProperties.length; i++) {
					for (j = 0; j < current_graph_state[k].neighbors[theProperties[i]].length; j++) {
						// these neighbors should receive labels and activation

						// first check if the neighbors exist; if not add them (in standardized form) to the subgraph
						var the_neighbor = current_graph_state[k].neighbors[theProperties[i]][j].neigh;
						//console.log(the_neighbor);
						assert.ok(the_neighbor === standardize_concept(the_neighbor), "neighbor: " + the_neighbor + ", std: " + standardize_concept(the_neighbor));
						if (current_graph_state.hasOwnProperty(the_neighbor) === false) {
							current_graph_state = augment_subgraph_by_including_new_concept(current_graph_state, the_neighbor, []);
						}
						//if (the_neighbor === '/c/en/north_america') {
						//	console.log('       labels before updates: ' + JSON.stringify(current_graph_state[the_neighbor].tempLabels));
						//}

						// Add activation to the node
						var old_value = current_graph_state[the_neighbor].tempWeight;
						var new_value = old_value + current_graph_state[k].spreadingWeight * g_decay_factor;
						if (new_value > 1.0) new_value = 1.0;
						if (new_value < 0.0) new_value = 0.0;
						current_graph_state[the_neighbor].tempWeight = new_value;
						if (new_value >= g_firing_threshold) {
							current_graph_state[the_neighbor].requestFireNodeNextRound = true;
						}

						// Add labels to the node
						// At the moment let's only treat up to two labels
						assert.ok(current_graph_state[the_neighbor].tempLabels.length <= 2);
						for (m = 0; m < current_graph_state[k].labels.length; m++) {
							found = false;
							for (l = 0; l < current_graph_state[the_neighbor].tempLabels.length; l++) {
								if (current_graph_state[the_neighbor].tempLabels[l] === current_graph_state[k].labels[m]) {
									found = true;
									break;
								}
							}
							if (found === false) {
								current_graph_state[the_neighbor].tempLabels.push(current_graph_state[k].labels[m]);
							}
						}
						//if (the_neighbor === '/c/en/north_america') {
						//	console.log('       labels after updates : ' + JSON.stringify(current_graph_state[the_neighbor].tempLabels));
						//}

						// determine distances
						d1 = current_graph_state[k].distance_from_concept1;
						d2 = current_graph_state[k].distance_from_concept2;
						// Let's first deal with distance from concept 1
						if (d1 > -0.5) {
							some_value = current_graph_state[the_neighbor].distance_from_concept1;
							if (some_value < 0) {
								current_graph_state[the_neighbor].distance_from_concept1 = d1 + 1;
								current_graph_state[the_neighbor].d_from_c1_obtained_by.push(k);
							} else {
								// current_graph_state[the_neighbor].distance_from_concept1 = Math.min(some_value, d1 + 1);
								if (d1 + 1 < some_value) {
									current_graph_state[the_neighbor].distance_from_concept1 = d1 + 1;
									current_graph_state[the_neighbor].d_from_c1_obtained_by  = [];
									current_graph_state[the_neighbor].d_from_c1_obtained_by.push(k);
								} else if (d1 + 1 === some_value) {
									// We found another way of reaching this node
									// Add the label in case it is not already there
									// rationale: for spreading activation that keeps on firing values
									// we may enter in this state several times
									if (current_graph_state[the_neighbor].d_from_c1_obtained_by.indexOf(k) === -1) {
										current_graph_state[the_neighbor].d_from_c1_obtained_by.push(k);
									}
								} // otherwise do nothing
							}
						}
						// Now let's deal with distance from concept 2
						if (d2 > -0.5) {
							some_value = current_graph_state[the_neighbor].distance_from_concept2;
							if (some_value < 0) {
								current_graph_state[the_neighbor].distance_from_concept2 = d2 + 1; // it was unreachable before and now reachable
								current_graph_state[the_neighbor].d_from_c2_obtained_by.push(k);
							} else {
								// current_graph_state[the_neighbor].distance_from_concept2 = Math.min(some_value, d2 + 1);
								if (d2 + 1 < some_value) {
									current_graph_state[the_neighbor].distance_from_concept2 = d2 + 1;
									current_graph_state[the_neighbor].d_from_c2_obtained_by  = [];
									current_graph_state[the_neighbor].d_from_c2_obtained_by.push(k);
								} else if (d2 + 1 === some_value) {
									// We found another way of reaching this node
									// Add the label in case it is not already there
									// rationale: for spreading activation that keeps on firing values
									// we may enter in this state several times
									if (current_graph_state[the_neighbor].d_from_c2_obtained_by.indexOf(k) === -1) {
										current_graph_state[the_neighbor].d_from_c2_obtained_by.push(k);
									}
								} // otherwise do nothing
							}
						}
						
					}
				}

				current_graph_state[k].timesFired += 1; 	// this guy fired one more time
			}
		}

		// Make the necessary updates
		// Note that the graph may have been expanded with additional concepts from the process above
		// So, fetch the keys again
		theKeys = Object.keys(current_graph_state);
		for (k of theKeys) {
			if (k !== dummy_graph_property_for_hacking) {
				// set the weights correctly
				current_graph_state[k].spreadingWeight = current_graph_state[k].tempWeight;

				// set the labels correctly
				current_graph_state[k].labels = [];
				for (l = 0; l < current_graph_state[k].tempLabels.length; l++) {
					current_graph_state[k].labels.push(current_graph_state[k].tempLabels[l]);
				}
				if (current_graph_state[k].labels.length === 2) {
					met_at_a_node = true;
					current_graph_state[k].is_meeting_node = true; // indicate that this is a meeting point for label propagation
					assert.ok(	(current_graph_state[k].distance_from_concept1 >= 0) && 
								(current_graph_state[k].distance_from_concept2 >= 0), 
								'labels: ' + JSON.stringify(current_graph_state[k].labels)); // verify logic
					//console.log('----> met at node: ' + k + '\twith sum: ' + (current_graph_state[k].distance_from_concept1 + current_graph_state[k].distance_from_concept2) + ' due to d1: ' + current_graph_state[k].distance_from_concept1 + ' and d2: ' + current_graph_state[k].distance_from_concept2);
				}

				if (current_graph_state[k].requestFireNodeNextRound === true) {
					current_graph_state[k].requestFireNode = true;
				} else {
					current_graph_state[k].requestFireNode = false;
				}
				current_graph_state[k].requestFireNodeNextRound = false;
			}
		}

		if (met_at_a_node === true) {
			// we have a solution
			return callback(null);
		} else if (current_iteration > g_max_spreading_activation_iters) {
			// We did not find a solution within the specified amount of time
			return callback(1); 	// DO NOT CHANGE THIS 1  --- thank you!
		}
		else {
			// we are still trying to find a node
			// where activation has reached from both ends
			var we_want_neighbors_of_those_concepts = [];
			for (k of theKeys) {
				if ((k !== dummy_graph_property_for_hacking) && 
					(Object.keys(current_graph_state[k].neighbors).length === 0)) {
					we_want_neighbors_of_those_concepts.push(k);
				}
			}

			spread_activation (db_object, current_iteration + 1, current_graph_state, we_want_neighbors_of_those_concepts, function (err_rec) {
				//assert.ok(err_rec === null);
				return callback(err_rec);
			});
		}
	});	
}

function gather_all_neighbors_for_this_round (db_object, current_graph_state, concepts_for_which_we_still_want_neighbors, /*temp_neighbors_array,*/ callback) {
	//var i, j;

	if (concepts_for_which_we_still_want_neighbors.length === 0) {
		/*
		 * End of recursion here
		 * 
		 * Sort the neighbors that you have and get rid of duplicates
		 */
		//process.stdout.write('\r  -------------------------------------    end of recursion (' + current_graph_state[dummy_graph_property_for_hacking].concepts_raised + ')   -------------------------------------\n');
		process.stdout.write('\r  -------------------------------------    end of recursion    -------------------------------------\n');
		//console.log('-------------------------------------    end of recursion   -------------------------------------');

		//return callback (null, temp_neighbors_array);
		return callback(null);
	} else {
		process.stdout.write('\r  concepts rem: ' + concepts_for_which_we_still_want_neighbors.length + '      ');
		var current_concept  = concepts_for_which_we_still_want_neighbors[0]; // this is a json object with properties: 'word' and 'value'
		var rest_concepts    = concepts_for_which_we_still_want_neighbors.slice(1);

		// Add the concept to the graph of interest
		// in case the concept is not already there
		if (current_graph_state.hasOwnProperty(current_concept) === false) {
			// we need to include this concept in the activated graph
			current_graph_state = augment_subgraph_by_including_new_concept (current_graph_state, current_concept, []);
		}

		// We need to fetch the neighbors of the current_concept only if we haven't done so in the past
		if (Object.keys(current_graph_state[current_concept].neighbors).length === 0) {
			// We need to fetch the neighbors of the current_concept

			//console.log('-- searching for neighbors of: ' + current_concept);
			get_neighbors_extended_version (db_object, current_graph_state, current_concept, function (err) {
				assert.ok(err === null);
				assert.ok(Object.keys(current_graph_state[current_concept].neighbors).length !== 0);

				// now proceed to the rest of the concepts 
				// where we potentially need to fetch their neighbors
				gather_all_neighbors_for_this_round(db_object, current_graph_state, rest_concepts, /*temp_neighbors_array,*/ function (err2) {
					assert.ok(err2 === null);

					return callback(null);
				});
			});
		} else {
			// We have already fetched the neighbors for this concept
			// no need to interact with the database again

			gather_all_neighbors_for_this_round(db_object, current_graph_state, rest_concepts, /*temp_neighbors_array,*/ function (err3) {
				assert.ok(err3 === null);

				return callback(null);
			});
		}		
	}
}

function get_neighbors_extended_version (db_object, current_graph_state, concept, callback) {
	assert.ok(concept !== 's');

	assert.ok(theProperties.length === 10); // failsafe to know what we are doing

	/*
	 * Words that have arisen due to the microsoft graph never end in:
	 * '/a', '/r', '/v', '/n'
	 * but nevertheless we may want to activate such concepts from other iterations of spreading activation
	 */
	var current_concept = standardize_concept (concept);
	assert.ok(current_concept === concept);

	var parallelCalls = {
		'start_no_s'             : get_neighbors.bind(null, db_object, {'start': current_concept}),
		'start_a'                : get_neighbors.bind(null, db_object, {'start': current_concept + '/a'}),
		'start_n'                : get_neighbors.bind(null, db_object, {'start': current_concept + '/n'}),
		'start_r'                : get_neighbors.bind(null, db_object, {'start': current_concept + '/r'}),
		'start_v'                : get_neighbors.bind(null, db_object, {'start': current_concept + '/v'}),
/*
		'start_append_s_vanilla' : get_neighbors.bind(null, db_object, {'start': current_concept + 's'}),
		'start_append_s_a'       : get_neighbors.bind(null, db_object, {'start': current_concept + 's/a'}),
		'start_append_s_n'       : get_neighbors.bind(null, db_object, {'start': current_concept + 's/n'}),
		'start_append_s_r'       : get_neighbors.bind(null, db_object, {'start': current_concept + 's/r'}),
		'start_append_s_v'       : get_neighbors.bind(null, db_object, {'start': current_concept + 's/v'}),
*/
		'end_no_s'               : get_neighbors.bind(null, db_object, {'end': current_concept}),
		'end_a'                  : get_neighbors.bind(null, db_object, {'end': current_concept + '/a'}),
		'end_n'                  : get_neighbors.bind(null, db_object, {'end': current_concept + '/n'}),
		'end_r'                  : get_neighbors.bind(null, db_object, {'end': current_concept + '/r'}),
		'end_v'                  : get_neighbors.bind(null, db_object, {'end': current_concept + '/v'})
/*
		'end_append_s_vanilla'   : get_neighbors.bind(null, db_object, {'end': current_concept + 's'}),
		'end_append_s_a'         : get_neighbors.bind(null, db_object, {'end': current_concept + 's/a'}),
		'end_append_s_n'         : get_neighbors.bind(null, db_object, {'end': current_concept + 's/n'}),
		'end_append_s_r'         : get_neighbors.bind(null, db_object, {'end': current_concept + 's/r'}),
		'end_append_s_v'         : get_neighbors.bind(null, db_object, {'end': current_concept + 's/v'}),
*/
	};

	async.parallel(parallelCalls, function (perr, pres) {
		assert.ok(perr === null);

		var i, j, k;
		var neighbors     = {};
		//var theProperties = ['start_no_s', 'start_a', 'start_n', 'start_r', 'start_v', 
		//		'start_append_s_vanilla', 'start_append_s_a', 'start_append_s_n', 'start_append_s_r', 'start_append_s_v',
		//		'end_no_s', 'end_a', 'end_n', 'end_r', 'end_v', 
		//		'end_append_s_vanilla', 'end_append_s_a', 'end_append_s_n', 'end_append_s_r', 'end_append_s_v'];
		var counter = 0;
		for (i = 0; i < theProperties.length; i++) {
			//console.log('property ' + theProperties[i] + ' has size ' + pres[theProperties[i]].length);
			neighbors[theProperties[i]] = [];

			for (j = 0; j < pres[theProperties[i]].length; j++) {
				counter++;
				if (theProperties[i][0] === 's') {
					neighbors[theProperties[i]].push(pres[theProperties[i]][j].end);
				} else {
					assert.ok(theProperties[i][0] === 'e');
					neighbors[theProperties[i]].push(pres[theProperties[i]][j].start);
				}
			}
		}
		
		if (counter === 0) {
			assert.ok (true === false); // this should never happen
			
			return callback(-1, 'error in logic');
		} else {

			// Get rid of the suffixes /a, /r, /n, /v first
			for (i = 0; i < theProperties.length; i++) {
				for (j = 0; j < neighbors[theProperties[i]].length; j++) {
					neighbors[theProperties[i]][j] = standardize_concept(neighbors[theProperties[i]][j]);
				}
				// Sort the concepts that you have just pushed so that we can get rid of the duplicates
				// and retain multiplicities
				neighbors[theProperties[i]].sort();
			}
			
			for (i = 0; i < theProperties.length; i++) {
				current_graph_state[current_concept].neighbors[theProperties[i]] = [];
				//k = 0;
				for (j = 0; j < neighbors[theProperties[i]].length; j++) {
					if (j === 0) {
						current_graph_state[current_concept].neighbors[theProperties[i]].push({'neigh': neighbors[theProperties[i]][j], 'mul': 1});
						k = 0;
					} else {
						if (current_graph_state[current_concept].neighbors[theProperties[i]][k].neigh === neighbors[theProperties[i]][j]) {
							current_graph_state[current_concept].neighbors[theProperties[i]][k].mul += 1; // increase the multiplicity
						} else {
							current_graph_state[current_concept].neighbors[theProperties[i]].push({'neigh': neighbors[theProperties[i]][j], 'mul': 1});
							k++;
						}
					}
				}
			}
			
			return callback(null);
		}
	});
}

/*****************************************************************************/

function get_neighbors (db_object, theQuery, callback) {
	//console.log('the query is: ' + JSON.stringify(theQuery) );
	db_object.collection(collection_to_query).find(theQuery).toArray(function (err, result) {
		assert.ok(err === null);
		return callback(null, result);
	});
}

/*****************************************************************************/

function normalize_concept_ignore_serial_s (aConcept) {
	assert.ok(aConcept.length > 0, 'empty string did not pass: ' + aConcept);

	var temp_concept = "";
	if (aConcept[0] === "/") { temp_concept = aConcept; }
	else { /* prepend with /c/en */ temp_concept = "/c/en/" + aConcept; }

	var i, count_slashes = 0;
	for (i = 0; i < temp_concept.length; i++) {
		if (temp_concept[i] === '/')
			count_slashes++;
	}

	var temp_concept2 = "";
	if (count_slashes > 3) {
		// Only now it makes sense to remove a potential suffix such as `/a`, '/r', '/n', '/v'
		// exceptions:
		// -- '/a': no exceptions (should be ok ...)
		// -- '/r': no exceptions
		// -- '/n': no exceptions (c/n and s/n are weird but I leave them as they are)
		// -- '/v': no exceptions (leaving r/v)
		temp_concept2 = get_concept_without_suffix(temp_concept);
	} else {
		temp_concept2 = temp_concept;
	}

	return temp_concept2;
}

/*****************************************************************************/

function standardize_concept (aConcept) {
	assert.ok(theProperties.length === 10); // failsafe

	return normalize_concept_ignore_serial_s(aConcept);
/*
	assert.ok(aConcept.length > 0, 'empty string did not pass: ' + aConcept);

	var temp_concept = "";
	if (aConcept[0] === "/") { temp_concept = aConcept; }
	else { temp_concept = "/c/en/" + aConcept; } // prepend with /c/en 

	var i, count_slashes = 0;
	for (i = 0; i < temp_concept.length; i++) {
		if (temp_concept[i] === '/')
			count_slashes++;
	}

	var temp_concept2 = "";
	if (count_slashes > 3) {
		// Only now it makes sense to remove a potential suffix
		temp_concept2 = get_concept_without_suffix(temp_concept);
	} else {
		temp_concept2 = temp_concept;
	}

	// now get rid of the last s
	var temp_concept3 = get_concept_without_serial_s(temp_concept2);
	var size = temp_concept3.length;
	if (temp_concept3[size - 1] === 's') {
		// the concept ended in two s's (e.g., process, access, etc.)
		// so put the last 's' back in place
		temp_concept3 += 's';
		size += 1;
	}

	return temp_concept3;
*/
}

function get_concept_without_suffix (aConcept) {
	if (aConcept.length < 2) 
		return aConcept;

	var size = aConcept.length;
	if (((aConcept[size - 2] === '/') && (aConcept[size - 1] === 'a')) ||
		((aConcept[size - 2] === '/') && (aConcept[size - 1] === 'n')) ||
		((aConcept[size - 2] === '/') && (aConcept[size - 1] === 'r')) ||
		((aConcept[size - 2] === '/') && (aConcept[size - 1] === 'v'))) {
		// ends in one of the above cases; remove that suffix
		var i;
		var simple_concept = "";
		for (i = 0; i < size - 2; i++)
			simple_concept += aConcept[i];
		return simple_concept;
	} else { 
		return aConcept;
	}
}

function get_concept_without_serial_s (aConcept) {
	if (aConcept.length < 2)
		return aConcept;

	if (aConcept[aConcept.length - 1] !== 's')
		return aConcept;

	var no_s = "";
	var i;
	for (i = 0; i < aConcept.length - 1; i++) {
		no_s += aConcept[i];
	}
	return no_s;
}

/*****************************************************************************/
/*****************************************************************************/
/*****************************************************************************/

function select_top_K_words (db_object, theFileWeCreated, topKconstant, callback) {
	fs.readFile(theFileWeCreated, {encoding: 'utf8', flag: 'r'}, function (err1, data_read) {
		assert.ok(err1 === null);
		var total_degrees_text = data_read.split("\n");
		var i;
		var total_degrees = [];
		console.log("total degree length: " + total_degrees_text.length);
		for (i = 0; i < total_degrees_text.length; i++) {
			var temp = total_degrees_text[i].split(" ");
			total_degrees.push( {'index': parseInt(temp[0], 10), 'value': parseInt(temp[1], 10)} );
		}

		fs.readFile(fname_glove /*fname_glove_ms*/, {encoding: 'utf8', flag: 'r'}, function (err2, entire_data/*entire_data_ms*/) {
			assert.ok(err2 === null, err2);
			var data    = entire_data.split("\n");
			//var data_ms = entire_data_ms.split("\n");
			//console.log ("The length is: " + data_ms.length);
			console.log ("The length is: " + data.length);
			//assert.ok(data_ms.length === total_degrees.length); // one to one correspondence
			assert.ok(data.length === total_degrees.length); // one to one correspondence

			// sort according to the total degrees (decreasing order)
			total_degrees.sort(function (a, b) { return (b.value - a.value); });

			var top_K_words = [];
			for (i = 0; i < Math.min(topKconstant, /*data_ms.length*/data.length); i++) {
				top_K_words.push({
					'word': data[total_degrees[i].index], //data_ms[total_degrees[i].index], 
					'conceptnet_total_degree': total_degrees[i].value,
					'original_index': total_degrees[i].index,
					'conceptnet_index': i
				});
			}

			return callback(null, top_K_words);
		});
	});
}


/*****************************************************************************/
/*****************************************************************************/
/*****************************************************************************/

function lets_rock (db_object, callback){
	var i;

	// Read the file from Glove
	fs.readFile(fname_glove, {encoding: 'utf8', flag: 'r'}, function (err1, entire_data) {
		if (err1) throw err1;

		var data = entire_data.split("\n");
		console.log ("The length is: " + data.length);

		// Read the file obtained from Glove and then intersected with the Microsoft graph
		fs.readFile(fname_glove_ms, {encoding: 'utf8', flag: 'r'}, function (err2, entire_data_ms) {
			if (err2) throw err2;

			var data_ms = entire_data_ms.split("\n");
			console.log ("The length is: " + data_ms.length);

			var process_start  = process.hrtime();
			process_objects_without_serial_s (db_object, 
				/*data_ms, data_ms.length,*/
				data, data.length,
				0,
			//process_objects(db_object, data_ms, data_ms.length, 0, 
					/* just a hack for quick code generation. */ 
					{'____application_authors_for_this_reasoning_project': 'something'}, 
					process_start, 
					function (err3, results) {
				if (err3) throw err3;
				//console.log("caller results: " + JSON.stringify(results, null, 3));

				var toWrite = "";
				for (i = 0; i < /*data_ms.length*/ data.length; i++) {
					//toWrite += "" + i + " " + results[data_ms[i]].total + "\n";
					toWrite += "" + i + " " + results[data[i]].total + "\n";
				}

				fs.writeFile(/*fname_graph_ms_no_s*/ fname_graph_no_s, toWrite, 'utf8', function (err5) {
				//fs.writeFile(fname_graph_ms, toWrite, 'utf8', function (err5) {
					if (err5) throw err5;
					console.log('Created a file for our graph');

					callback(null);
				});
			});

			/*
			db_object.collection(collection_to_query).countDocuments(query, function(err, result) {
				console.log("Result is: " + result);
				callback(null);
			});*/
		});
	});
}

/*****************************************************************************/

function process_objects (db_object, list_of_concepts, size, index, partial_solution, time_started, callback) {
	//console.log('size of array passed: ' + list_of_concepts.length);
	var now_time = process.hrtime(time_started);
	var duration  = []; 
	duration.push(now_time[0]); 
	duration.push(now_time[1] / 1000000);
	process.stdout.write('\rprocessing: ' + (index + 1) + " out of " + size + " (" + (100.0*(index+1)/size).toFixed(3) + "%) ---- time elapsed: " + get_time_elapsed_as_string(duration) + "          ");

	if (index < size) {
		var current_concept = list_of_concepts[index];
		//console.log('******** current_concept: ' + current_concept);

		/*
		 * Now let's actually do something
		 *
		 * check also for the following suffixes: 
		 * /a: appears to be related to arithmetic or hyperlinks 
		 * /n: nouns
		 * /r: appears to be working
		 * /v: verbs
		 */
		var parallelCalls = {
			'start_vanilla'          : count_matches.bind(null, db_object, {'start': '/c/en/' + current_concept}),
			'start_a'                : count_matches.bind(null, db_object, {'start': '/c/en/' + current_concept + '/a'}),
			'start_n'                : count_matches.bind(null, db_object, {'start': '/c/en/' + current_concept + '/n'}),
			'start_r'                : count_matches.bind(null, db_object, {'start': '/c/en/' + current_concept + '/r'}),
			'start_v'                : count_matches.bind(null, db_object, {'start': '/c/en/' + current_concept + '/v'}),
			'start_append_s_vanilla' : count_matches.bind(null, db_object, {'start': '/c/en/' + current_concept + 's'}),
			'start_append_s_a'       : count_matches.bind(null, db_object, {'start': '/c/en/' + current_concept + 's/a'}),
			'start_append_s_n'       : count_matches.bind(null, db_object, {'start': '/c/en/' + current_concept + 's/n'}),
			'start_append_s_r'       : count_matches.bind(null, db_object, {'start': '/c/en/' + current_concept + 's/r'}),
			'start_append_s_v'       : count_matches.bind(null, db_object, {'start': '/c/en/' + current_concept + 's/v'}),
			'end_vanilla'            : count_matches.bind(null, db_object, {'end': '/c/en/' + current_concept}),
			'end_a'                  : count_matches.bind(null, db_object, {'end': '/c/en/' + current_concept + '/a'}),
			'end_n'                  : count_matches.bind(null, db_object, {'end': '/c/en/' + current_concept + '/n'}),
			'end_r'                  : count_matches.bind(null, db_object, {'end': '/c/en/' + current_concept + '/r'}),
			'end_v'                  : count_matches.bind(null, db_object, {'end': '/c/en/' + current_concept + '/v'}),
			'end_append_s_vanilla'   : count_matches.bind(null, db_object, {'end': '/c/en/' + current_concept + 's'}),
			'end_append_s_a'         : count_matches.bind(null, db_object, {'end': '/c/en/' + current_concept + 's/a'}),
			'end_append_s_n'         : count_matches.bind(null, db_object, {'end': '/c/en/' + current_concept + 's/n'}),
			'end_append_s_r'         : count_matches.bind(null, db_object, {'end': '/c/en/' + current_concept + 's/r'}),
			'end_append_s_v'         : count_matches.bind(null, db_object, {'end': '/c/en/' + current_concept + 's/v'})
		};

		async.parallel(parallelCalls, function (error, results) {
			assert.ok( (error === null) );
			//console.log('results: ' + JSON.stringify(results, null, 3));
			var start_sum = 0, start_vanilla_only = 0; 
			start_vanilla_only = results.start_vanilla;
			start_sum          = results.start_vanilla + results.start_a + results.start_n + results.start_r + results.start_v;
			start_sum         += results.start_append_s_vanilla + results.start_append_s_a + results.start_append_s_n + results.start_append_s_r + results.start_append_s_v;
			var end_sum = 0, end_vanilla_only = 0;
			end_vanilla_only = results.end_vanilla;
			end_sum          = results.end_vanilla + results.end_a + results.end_n + results.end_r + results.end_v;
			end_sum         += results.end_append_s_vanilla + results.end_append_s_a + results.end_append_s_n + results.end_append_s_r + results.end_append_s_v;
			var total_sum = start_sum + end_sum;

			//console.log("Concept '" + current_concept + "': " + total_sum + "  [vs/start: " + start_vanilla_only + "/" + start_sum + ", ve/end: " + end_vanilla_only + "/" + end_sum + "]");

			// need some code here but I have to go to class ...
			assert.ok(partial_solution.hasOwnProperty(current_concept) === false);
			partial_solution[current_concept] = {
				"total" : total_sum,
				"start_vanilla": start_vanilla_only,
				"start": start_sum,
				"end_vanilla": end_vanilla_only,
				"end": end_sum
			};

			if (index + 1 < size) {
				process_objects (db_object, list_of_concepts, size, index + 1, partial_solution, time_started, callback);
			} else {
				// we are done
				process.stdout.write('\rprocessing: ' + (index + 1) + " out of " + size + " (" + (100.0*(index+1)/size).toFixed(3) + "%) ---- time elapsed: " + get_time_elapsed_as_string(duration) + "          \n");
				return callback(null, partial_solution);
			}
		});
	} else {
		return callback(-1, 'index is out of bounds');
	}
}

/*****************************************************************************/

function process_objects_without_serial_s (db_object, list_of_concepts, size, index, partial_solution, time_started, callback) {
	//console.log('size of array passed: ' + list_of_concepts.length);
	var now_time = process.hrtime(time_started);
	var duration  = []; 
	duration.push(now_time[0]); 
	duration.push(now_time[1] / 1000000);
	process.stdout.write('\rprocessing: ' + (index + 1) + " out of " + size + " (" + (100.0*(index+1)/size).toFixed(3) + "%) ---- time elapsed: " + get_time_elapsed_as_string(duration) + "          ");

	if (index < size) {
		var current_concept = list_of_concepts[index];
		//console.log('******** current_concept: ' + current_concept);

		/*
		 * Now let's actually do something
		 *
		 * check also for the following suffixes: 
		 * /a: appears to be related to arithmetic or hyperlinks 
		 * /n: nouns
		 * /r: appears to be working
		 * /v: verbs
		 */
		var parallelCalls = {
			'start_vanilla'          : count_matches.bind(null, db_object, {'start': '/c/en/' + current_concept}),
			'start_a'                : count_matches.bind(null, db_object, {'start': '/c/en/' + current_concept + '/a'}),
			'start_n'                : count_matches.bind(null, db_object, {'start': '/c/en/' + current_concept + '/n'}),
			'start_r'                : count_matches.bind(null, db_object, {'start': '/c/en/' + current_concept + '/r'}),
			'start_v'                : count_matches.bind(null, db_object, {'start': '/c/en/' + current_concept + '/v'}),
			'end_vanilla'            : count_matches.bind(null, db_object, {'end': '/c/en/' + current_concept}),
			'end_a'                  : count_matches.bind(null, db_object, {'end': '/c/en/' + current_concept + '/a'}),
			'end_n'                  : count_matches.bind(null, db_object, {'end': '/c/en/' + current_concept + '/n'}),
			'end_r'                  : count_matches.bind(null, db_object, {'end': '/c/en/' + current_concept + '/r'}),
			'end_v'                  : count_matches.bind(null, db_object, {'end': '/c/en/' + current_concept + '/v'})
		};

		async.parallel(parallelCalls, function (error, results) {
			assert.ok( (error === null) );
			//console.log('results: ' + JSON.stringify(results, null, 3));
			var start_sum = 0, start_vanilla_only = 0; 
			start_vanilla_only = results.start_vanilla;
			start_sum          = results.start_vanilla + results.start_a + results.start_n + results.start_r + results.start_v;
			var end_sum = 0, end_vanilla_only = 0;
			end_vanilla_only = results.end_vanilla;
			end_sum          = results.end_vanilla + results.end_a + results.end_n + results.end_r + results.end_v;
			var total_sum    = start_sum + end_sum;

			//console.log("Concept '" + current_concept + "': " + total_sum + "  [vs/start: " + start_vanilla_only + "/" + start_sum + ", ve/end: " + end_vanilla_only + "/" + end_sum + "]");

			// need some code here but I have to go to class ...
			assert.ok(partial_solution.hasOwnProperty(current_concept) === false);
			partial_solution[current_concept] = {
				"total" : total_sum,
				"start_vanilla": start_vanilla_only,
				"start": start_sum,
				"end_vanilla": end_vanilla_only,
				"end": end_sum
			};

			if (index + 1 < size) {
				process_objects_without_serial_s (db_object, list_of_concepts, size, index + 1, partial_solution, time_started, callback);
			} else {
				// we are done
				process.stdout.write('\rprocessing: ' + (index + 1) + " out of " + size + " (" + (100.0*(index+1)/size).toFixed(3) + "%) ---- time elapsed: " + get_time_elapsed_as_string(duration) + "          \n");
				return callback(null, partial_solution);
			}
		});
	} else {
		return callback(-1, 'index is out of bounds');
	}
}

/*****************************************************************************/

function count_matches (db_object, theQuery, callback) {
	//console.log('____________________________ the query is: ' + JSON.stringify(theQuery, null, 3));
	db_object.collection(collection_to_query).countDocuments(theQuery, function (err, result) {
		assert.ok(err === null);
		return callback(null, result);
	});
}

/*****************************************************************************/


/*****************************************************************************/
/*****************************************************************************/
/*****************************************************************************/

function get_time_elapsed_as_string (hrquantity) {
	var the_minutes, hours, rem_secs;

	var the_msecs = Math.round(hrquantity[1] / 1000000);
	var the_secs  = hrquantity[0];

	if (the_secs < 1) {
		if (the_msecs >= 1) return '' + the_msecs + ' msecs';
		else 				return '' + Number(hrquantity[1]).toFixed(1) + ' nanosecs';
	}
	else {
		if (the_msecs >= 500) {
			the_secs++; // round up to the next second if necessary
		}

		if (the_secs < 60) {
			return '' + the_secs + ' secs';
		}
		else {
			the_minutes = Math.trunc(the_secs / 60);
			if (the_minutes < 60) {
				rem_secs = the_secs - the_minutes * 60;
				return '' + the_minutes + ' minutes ' + rem_secs + ' secs';
			} else {
				hours       = Math.trunc(the_secs / 3600);
				rem_secs    = the_secs - hours * 3600;
				the_minutes = Math.trunc( rem_secs / 60 );
				rem_secs    = rem_secs - the_minutes * 60;
				return '' + hours + ' hour(s) ' + the_minutes + ' minutes' + rem_secs + ' secs';
			}
		}
	}
}

/*****************************************************************************/
