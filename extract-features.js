const solr = require('./solr');

const fs = require('fs');
const request = require('request-promise');

const inputFile = 'hits.json';

function extractFeatures(titles, qid, query) {
    let queryString = 'title_exact_s:("' + titles.map(solr.escape).join('" OR "') + '")';
    let returnFields = `title_exact_s, [features store=wikipedia efi.text="${query}"]`;

    return request({
        url: solr.hostAndCore + '/select',
        qs: {
            q: queryString,
            start: 0,
            rows: titles.length,
            wt: 'json',
            fl: returnFields
        },
        json: true
    }).then((response) => {
        let featuresByTitle = mapFeaturesByTitle(response);

        checkMissingTitles(titles, Object.keys(featuresByTitle), query);

        let featureList = buildFeatureList(titles, featuresByTitle);

        return {
            qid: qid,
            query: query,
            featureResults: featureList
        };
    }).catch((error) => {
        console.error(`Could not get Solr features for "${query}": ${error}`)
    });
}

function mapFeaturesByTitle(response) {
    return response.response.docs.reduce((featuresByTitle, doc) => {
        featuresByTitle[doc.title_exact_s] = buildFeatureString(doc);
        return featuresByTitle;
    }, {});
}

function checkMissingTitles(expectedTitles, actualTitles, query) {
    let missingTitles = expectedTitles.filter((title) => {
        return actualTitles.indexOf(title) < 0;
    });

    if (missingTitles.length > 0) {
        console.error(`Missing titles for "${query}": ${missingTitles}`);
    }
}

function buildFeatureList(titles, featuresByTitle) {
    return titles.map((title, index) => {
        return {
            rank: titles.length - index,
            title: title,
            features: featuresByTitle[title] || ''
        };
    });
}

function buildFeatureString(doc) {
    return doc['[features]'].split(' ').reduce((accumulator, feature, i) => {

        /* Feature given by Solr is featureName:featureValue, eg. recency:0.5 */
        let [name, value] = feature.split(':');

        /* We need featureIndex:featureValue, eg. 2:0.5 */
        let featureString = [i + 1, value].join(':');

        accumulator.push(featureString);
        return accumulator;
    }, []).join(' ');
}

fs.readFile(inputFile, null, (error, contents) => {
    let data = JSON.parse(contents);

    Promise.all(Object.keys(data).map((query, qid) => {
        let results = data[query];
        return extractFeatures(results, qid, query);
    })).then((results) => {
        let output = buildTrainingData(results);
        fs.writeFileSync('training.csv', output);
    });
});

function buildTrainingData(results) {
    return results.reduce((output, queryResult) => {
        let message = '';

        if ((typeof queryResult !== 'undefined') && (queryResult.featureResults.length > 0)) {
            message = queryResult.featureResults.reduce((output, featureResult) => {
                let message = '';

                if ((typeof featureResult !== 'undefined') && (featureResult.features.length > 0)) {
                    message = `${featureResult.rank} qid:${queryResult.qid + 1} ${featureResult.features} # ${queryResult.query} => ${featureResult.title}` + "\n";
                }

                return output + message;
            }, '') + "#\n";
        }

        return output + message;
    }, '');
}
