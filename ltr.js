const request = require('request-promise');
const solr = require('./solr');

const featureStoreName = 'wikipedia';
const features = [
    {
        'store': featureStoreName,
        'name': 'documentRecency',
        'class': 'org.apache.solr.ltr.feature.SolrFeature',
        'params': {
            'q': '{!func}recip( ms(NOW,last_updated_dt), 3.16e-11, 1, 1)'
        }
    },
    {
        'store': featureStoreName,
        'name': 'popularity',
        'class': 'org.apache.solr.ltr.feature.FieldValueFeature',
        'params': {
            'field': 'popularity_score_d'
        }
    },
    {
        'store': featureStoreName,
        'name': 'totalScore',
        'class': 'org.apache.solr.ltr.feature.SolrFeature',
        'params': {
            'q': `{!edismax qf="${solr.qf}"}\${text}`
        }
    },
    {
        'store': featureStoreName,
        'name': 'titleScore',
        'class': 'org.apache.solr.ltr.feature.SolrFeature',
        'params': {
            'q': `{!edismax qf="title_txt_en"}\${text}`
        }
    },
    {
        'store': featureStoreName,
        'name': 'exactTitle',
        'class': 'org.apache.solr.ltr.feature.SolrFeature',
        'params': {
            'q': `{!df="title_exact_s_lower"}\${text}`
        }
    },
    {
        'store': featureStoreName,
        'name': 'headingsScore',
        'class': 'org.apache.solr.ltr.feature.SolrFeature',
        'params': {
            'q': `{!edismax qf="headings_txt_en"}\${text}`
        }
    },
    {
        'store': featureStoreName,
        'name': 'categoriesScore',
        'class': 'org.apache.solr.ltr.feature.SolrFeature',
        'params': {
            'q': `{!edismax qf="categories_txts_en"}\${text}`
        }
    },
    {
        'store': featureStoreName,
        'name': 'openingScore',
        'class': 'org.apache.solr.ltr.feature.SolrFeature',
        'params': {
            'q': `{!edismax qf="opening_text_txt_en"}\${text}`
        }
    },
    {
        'store': featureStoreName,
        'name': 'textScore',
        'class': 'org.apache.solr.ltr.feature.SolrFeature',
        'params': {
            'q': `{!edismax qf="text_txt_en"}\${text}`
        }
    }
];

const linearModelName = 'linear';
const linearModel = {
    'class': 'org.apache.solr.ltr.model.LinearModel',
    'name': linearModelName,
    'store': featureStoreName,
    'features': [
        {'name': 'documentRecency'},
        {'name': 'popularity'},
        {'name': 'totalScore'},
        {'name': 'titleScore'},
        {'name': 'headingsScore'},
        {'name': 'categoriesScore'},
        {'name': 'openingScore'},
        {'name': 'textScore'},

    ],
    'params': {
        'weights': {
            'documentRecency': 0.053789198,
            'popularity': 2.7602253e-05,
            'totalScore': 0.11210245,
            'titleScore': 0.15032272,
            'exactTitle': 0.052073978,
            'headingsScore': 0.021680757,
            'categoriesScore': 0.0043489928,
            'openingScore': 0.038307097,
            'textScore': 0.11320153
        }
    }
};
const treeModelName = 'tree';
const treeModel = {
    "params": {
        "trees": [
            {
                "root": {
                    "threshold": "8.015305",
                    "right": {
                        "threshold": "6.591926",
                        "right": {
                            "value": "41.31952667236328"
                        },
                        "feature": "titleScore",
                        "left": {
                            "threshold": "17.064507",
                            "right": {
                                "value": "9.142857551574707"
                            },
                            "feature": "textScore",
                            "left": {
                                "threshold": "10.40794",
                                "right": {
                                    "value": "33.568626403808594"
                                },
                                "feature": "openingScore",
                                "left": {
                                    "threshold": "7.0917444",
                                    "right": {
                                        "threshold": "16.269894",
                                        "right": {
                                            "value": "44.5"
                                        },
                                        "feature": "totalScore",
                                        "left": {
                                            "threshold": "0.0",
                                            "right": {
                                                "value": "35.0625"
                                            },
                                            "feature": "titleScore",
                                            "left": {
                                                "value": "26.75052833557129"
                                            }
                                        }
                                    },
                                    "feature": "textScore",
                                    "left": {
                                        "value": "20.696969985961914"
                                    }
                                }
                            }
                        }
                    },
                    "feature": "totalScore",
                    "left": {
                        "threshold": "6.980936",
                        "right": {
                            "value": "23.06989288330078"
                        },
                        "feature": "textScore",
                        "left": {
                            "threshold": "4.665628",
                            "right": {
                                "value": "17.854679107666016"
                            },
                            "feature": "totalScore",
                            "left": {
                                "value": "14.266666412353516"
                            }
                        }
                    }
                },
                "weight": "0.1"
            },
            {
                "root": {
                    "threshold": "8.134936",
                    "right": {
                        "threshold": "6.591926",
                        "right": {
                            "value": "37.35026550292969"
                        },
                        "feature": "titleScore",
                        "left": {
                            "threshold": "17.064507",
                            "right": {
                                "value": "8.228570938110352"
                            },
                            "feature": "textScore",
                            "left": {
                                "threshold": "10.40794",
                                "right": {
                                    "value": "30.211776733398438"
                                },
                                "feature": "openingScore",
                                "left": {
                                    "threshold": "5.621436E-6",
                                    "right": {
                                        "value": "26.905437469482422"
                                    },
                                    "feature": "popularity",
                                    "left": {
                                        "threshold": "8.975487",
                                        "right": {
                                            "value": "24.985057830810547"
                                        },
                                        "feature": "textScore",
                                        "left": {
                                            "value": "20.031383514404297"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "feature": "totalScore",
                    "left": {
                        "threshold": "6.980936",
                        "right": {
                            "value": "21.07978057861328"
                        },
                        "feature": "textScore",
                        "left": {
                            "threshold": "4.665628",
                            "right": {
                                "threshold": "4.681254",
                                "right": {
                                    "value": "7.3801798820495605"
                                },
                                "feature": "categoriesScore",
                                "left": {
                                    "value": "16.41324234008789"
                                }
                            },
                            "feature": "totalScore",
                            "left": {
                                "value": "12.839949607849121"
                            }
                        }
                    }
                },
                "weight": "0.1"
            },
            {
                "root": {
                    "threshold": "8.134936",
                    "right": {
                        "threshold": "6.591926",
                        "right": {
                            "value": "33.6151237487793"
                        },
                        "feature": "titleScore",
                        "left": {
                            "threshold": "17.064507",
                            "right": {
                                "value": "7.4057135581970215"
                            },
                            "feature": "textScore",
                            "left": {
                                "threshold": "12.322048",
                                "right": {
                                    "value": "30.89973258972168"
                                },
                                "feature": "openingScore",
                                "left": {
                                    "threshold": "2.7508993E-5",
                                    "right": {
                                        "value": "27.388782501220703"
                                    },
                                    "feature": "popularity",
                                    "left": {
                                        "threshold": "7.0917444",
                                        "right": {
                                            "threshold": "16.269894",
                                            "right": {
                                                "value": "37.50348663330078"
                                            },
                                            "feature": "totalScore",
                                            "left": {
                                                "value": "21.749059677124023"
                                            }
                                        },
                                        "feature": "textScore",
                                        "left": {
                                            "value": "14.894891738891602"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "feature": "totalScore",
                    "left": {
                        "threshold": "6.980936",
                        "right": {
                            "value": "18.971752166748047"
                        },
                        "feature": "textScore",
                        "left": {
                            "threshold": "4.543152",
                            "right": {
                                "value": "14.461105346679688"
                            },
                            "feature": "textScore",
                            "left": {
                                "value": "11.625665664672852"
                            }
                        }
                    }
                },
                "weight": "0.1"
            },
            {
                "root": {
                    "threshold": "8.015305",
                    "right": {
                        "threshold": "6.591926",
                        "right": {
                            "value": "30.10930633544922"
                        },
                        "feature": "titleScore",
                        "left": {
                            "threshold": "0.7924475",
                            "right": {
                                "value": "22.029977798461914"
                            },
                            "feature": "documentRecency",
                            "left": {
                                "threshold": "12.299738",
                                "right": {
                                    "value": "15.280513763427734"
                                },
                                "feature": "textScore",
                                "left": {
                                    "threshold": "10.766835",
                                    "right": {
                                        "value": "22.59454345703125"
                                    },
                                    "feature": "totalScore",
                                    "left": {
                                        "value": "18.455615997314453"
                                    }
                                }
                            }
                        }
                    },
                    "feature": "totalScore",
                    "left": {
                        "threshold": "6.980936",
                        "right": {
                            "value": "16.75771141052246"
                        },
                        "feature": "textScore",
                        "left": {
                            "threshold": "4.665628",
                            "right": {
                                "threshold": "4.681254",
                                "right": {
                                    "value": "5.3335676193237305"
                                },
                                "feature": "categoriesScore",
                                "left": {
                                    "threshold": "5.621436E-6",
                                    "right": {
                                        "value": "14.595552444458008"
                                    },
                                    "feature": "popularity",
                                    "left": {
                                        "value": "12.181750297546387"
                                    }
                                }
                            },
                            "feature": "totalScore",
                            "left": {
                                "value": "10.386029243469238"
                            }
                        }
                    }
                },
                "weight": "0.1"
            },
            {
                "root": {
                    "threshold": "8.733095",
                    "right": {
                        "threshold": "6.591926",
                        "right": {
                            "value": "27.329431533813477"
                        },
                        "feature": "titleScore",
                        "left": {
                            "threshold": "0.7924475",
                            "right": {
                                "value": "21.153181076049805"
                            },
                            "feature": "documentRecency",
                            "left": {
                                "threshold": "12.299738",
                                "right": {
                                    "value": "13.75245189666748"
                                },
                                "feature": "textScore",
                                "left": {
                                    "value": "17.945226669311523"
                                }
                            }
                        }
                    },
                    "feature": "totalScore",
                    "left": {
                        "threshold": "6.980936",
                        "right": {
                            "threshold": "5.621436E-6",
                            "right": {
                                "value": "18.519081115722656"
                            },
                            "feature": "popularity",
                            "left": {
                                "value": "14.108916282653809"
                            }
                        },
                        "feature": "textScore",
                        "left": {
                            "threshold": "0.0",
                            "right": {
                                "threshold": "4.0674715",
                                "right": {
                                    "threshold": "5.621436E-6",
                                    "right": {
                                        "value": "12.799086570739746"
                                    },
                                    "feature": "popularity",
                                    "left": {
                                        "value": "10.440407752990723"
                                    }
                                },
                                "feature": "totalScore",
                                "left": {
                                    "value": "5.732352256774902"
                                }
                            },
                            "feature": "totalScore",
                            "left": {
                                "value": "13.14220905303955"
                            }
                        }
                    }
                },
                "weight": "0.1"
            }
        ]
    },
    "features": [
        {
            "name": "documentRecency"
        },
        {
            "name": "popularity"
        },
        {
            "name": "totalScore"
        },
        {
            "name": "titleScore"
        },
        {
            "name": "exactTitle"
        },
        {
            "name": "headingsScore"
        },
        {
            "name": "categoriesScore"
        },
        {
            "name": "openingScore"
        },
        {
            "name": "textScore"
        }
    ],
    "name": treeModelName,
    "store": featureStoreName,
    "class": "org.apache.solr.ltr.model.MultipleAdditiveTreesModel"
};
const models = {};
models[linearModelName] = linearModel;
models[treeModelName] = treeModel;

function getFeatureNames() {
    return linearModel.features.map((feature) => {
        return feature.name;
    });
}

function configureLtr() {
    return Promise.all([addLtrQueryParser(), addLtrFeatureTransformer()]);
}

function checkForLtrQueryParser() {
    console.debug('Checking for existence of LTR query parser.');

    return new Promise((resolve, reject) => {
        request(solr.hostAndCore + '/config/queryParser').then((data) => {
            let queryParsers = JSON.parse(data);

            resolve(!!(queryParsers.config.queryParser && queryParsers.config.queryParser.ltr));
        }).catch((error) => {
            reject('Could not check existence of LTR query parser: ' + error);
        });
    });
}

function addLtrQueryParser() {
    checkForLtrQueryParser().then((ltrQueryParserExists) => {
        if (!ltrQueryParserExists) {
            console.log('Adding LTR query parser.');

            return request.post({
                url: solr.hostAndCore + '/config',
                json: {
                    'add-queryparser': {
                        'name': 'ltr',
                        'class': 'org.apache.solr.ltr.search.LTRQParserPlugin'
                    }
                }
            }).then(() => {
                console.log('Successfully added LTR query parser.');
            }).catch((error) => {
                throw('Error adding LTR query parser: ' + error);
            });
        }
    });
}

function checkForLtrFeatureTransformer() {
    console.debug('Checking for existence of LTR feature transformer');

    return new Promise((resolve, reject) => {
        request(solr.hostAndCore + '/config/transformer').then((data) => {
            let transformer = JSON.parse(data);

            resolve(!!(transformer.config.transformer && transformer.config.transformer.features));
        }).catch((error) => {
            reject('Could not check existence of LTR feature transformer: ' + error);
        });
    });
}

function addLtrFeatureTransformer() {
    checkForLtrFeatureTransformer().then((ltrFeatureTransformerExists) => {
        if (!ltrFeatureTransformerExists) {
            console.log('Adding LTR feature transformer.');

            return request.post({
                url: solr.hostAndCore + '/config',
                json: {
                    'add-transformer': {
                        'name': 'features',
                        'class': 'org.apache.solr.ltr.response.transform.LTRFeatureLoggerTransformerFactory',
                        'fvCacheName': 'QUERY_DOC_FV', // TODO: Configure this cache.
                        'defaultFormat': 'dense',
                        'csvKeyValueDelimiter': ':',
                        'csvFeatureSeparator': ' '
                    }
                }
            }).then(() => {
                console.log('Successfully added LTR feature transformer.');
            }).catch((error) => {
                throw('Error adding LTR feature transformer: ' + error);
            });
        }
    });
}

function uploadLtrConfig() {
    return deleteLtrFeatures().then(uploadLtrFeatures).then(deleteLtrModel).then(uploadLtrModel);
}

function deleteLtrFeatures() {
    console.debug('Deleting old LTR features.');

    return request.delete(solr.hostAndCore + '/schema/feature-store/' + featureStoreName).then(() => {
        console.debug('Successfully deleted old LTR features.');
    })
        .catch((error) => {
            throw('Could not delete old LTR features: ' + error);
        });
}

function uploadLtrFeatures() {
    console.debug('Uploading LTR features.');

    return request.put({url: solr.hostAndCore + '/schema/feature-store', json: features}).then(() => {
        console.log('Successfully uploaded LTR features.');
    }).catch((error) => {
        throw('Could not upload LTR features: ' + error);
    });
}

function deleteLtrModel() {
    console.debug('Deleting old LTR model.');

    let promises = Object.keys(models).map((modelName) => {
        return request.delete(solr.hostAndCore + '/schema/model-store/' + modelName).then(() => {
            console.log(`Successfully deleted old LTR model "${modelName}".`);
        }).catch((error) => {
            throw(`Could not delete old LTR model "${modelName}": ${error}`);
        });
    });

    return Promise.all(promises);
}

function uploadLtrModel() {
    console.debug('Uploading LTR model.');

    let promises = Object.keys(models).map((modelName) => {
        let model = models[modelName];

        return request.put({url: solr.hostAndCore + '/schema/model-store', json: model}).then(() => {
            console.log(`Successfully uploaded LTR model "${modelName}".`);
        }).catch((error) => {
            throw(`Could not upload LTR model "${modelName}": ${error}`);
        });
    });

    return Promise.all(promises);
}

module.exports = {
    configureLtr: configureLtr,
    uploadLtrConfig: uploadLtrConfig,
    getFeatureNames: getFeatureNames,
    models: models
};
