const request = require('request-promise');
const solr = require('./solr');

const ltrFeatureStoreName = 'wikipedia';
const ltrFeatures = [
    {
        'store': ltrFeatureStoreName,
        'name': 'documentRecency',
        'class': 'org.apache.solr.ltr.feature.SolrFeature',
        'params': {
            'q': '{!func}recip( ms(NOW,last_updated_dt), 3.16e-11, 1, 1)'
        }
    },
    {
        'store': ltrFeatureStoreName,
        'name': 'popularity',
        'class': 'org.apache.solr.ltr.feature.FieldValueFeature',
        'params': {
            'field': 'popularity_score_d'
        }
    },
    {
        'store': ltrFeatureStoreName,
        'name': 'totalScore',
        'class': 'org.apache.solr.ltr.feature.SolrFeature',
        'params': {
            'q': `{!edismax qf="${solr.qf}"}\${text}`
        }
    },
    {
        'store': ltrFeatureStoreName,
        'name': 'titleScore',
        'class': 'org.apache.solr.ltr.feature.SolrFeature',
        'params': {
            'q': `{!edismax qf="title_txt_en"}\${text}`
        }
    },
    {
        'store': ltrFeatureStoreName,
        'name': 'exactTitle',
        'class': 'org.apache.solr.ltr.feature.SolrFeature',
        'params': {
            'q': `{!df="title_exact_s_lower"}\${text}`
        }
    },
    {
        'store': ltrFeatureStoreName,
        'name': 'headingsScore',
        'class': 'org.apache.solr.ltr.feature.SolrFeature',
        'params': {
            'q': `{!edismax qf="headings_txt_en"}\${text}`
        }
    },
    {
        'store': ltrFeatureStoreName,
        'name': 'categoriesScore',
        'class': 'org.apache.solr.ltr.feature.SolrFeature',
        'params': {
            'q': `{!edismax qf="categories_txts_en"}\${text}`
        }
    },
    {
        'store': ltrFeatureStoreName,
        'name': 'openingScore',
        'class': 'org.apache.solr.ltr.feature.SolrFeature',
        'params': {
            'q': `{!edismax qf="opening_text_txt_en"}\${text}`
        }
    },
    {
        'store': ltrFeatureStoreName,
        'name': 'textScore',
        'class': 'org.apache.solr.ltr.feature.SolrFeature',
        'params': {
            'q': `{!edismax qf="text_txt_en"}\${text}`
        }
    }
];

const ltrModelName = 'wikipedia';
const ltrModel = {
    'class': 'org.apache.solr.ltr.model.LinearModel',
    'name': ltrModelName,
    'store': ltrFeatureStoreName,
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

    return request.delete(solr.hostAndCore + '/schema/feature-store/' + ltrFeatureStoreName).then(() => {
        console.debug('Successfully deleted old LTR features.');
    })
        .catch((error) => {
            throw('Could not delete old LTR features: ' + error);
        });
}

function uploadLtrFeatures() {
    console.debug('Uploading LTR features.');

    return request.put({url: solr.hostAndCore + '/schema/feature-store', json: ltrFeatures}).then(() => {
        console.log('Successfully uploaded LTR features.');
    }).catch((error) => {
        throw('Could not upload LTR features: ' + error);
    });
}

function deleteLtrModel() {
    console.debug('Deleting old LTR model.');

    return request.delete(solr.hostAndCore + '/schema/model-store/' + ltrModelName).then(() => {
        console.log('Successfully deleted old LTR model.');
    }).catch((error) => {
        throw('Could not delete old LTR model: ' + error);
    });
}

function uploadLtrModel() {
    console.debug('Uploading LTR model.');

    return request.put({url: solr.hostAndCore + '/schema/model-store', json: ltrModel}).then(() => {
        console.log('Successfully uploaded LTR model.');
    }).catch((error) => {
        throw('Could not upload LTR model: ' + error);
    });
}

module.exports = {
    configureLtr: configureLtr,
    uploadLtrConfig: uploadLtrConfig
};
