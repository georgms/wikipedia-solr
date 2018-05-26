const request = require('request-promise');

const hostAndCore = 'http://172.17.0.1:8983/solr/gettingstarted';
const qf = 'title_txt_en headings_txt_en categories_txts_en opening_text_txt_en text_txt_en';

function escape(string) {
    return string.replace(/"/, '\"');
}

function clearIndex() {
    return request.post({
        url: hostAndCore + '/update?commitWithin=1000&overwrite=true&wt=json',
        headers: {'Content-Type': 'text/xml'},
        body:
            '<add><delete><query>*:*</query></delete></add>'
    }).then(() => {
        console.debug('Successfully cleared Solr');
    }).catch((error) => {
        throw('Could not clear Solr: ' + error);
    });
}

function addMultiValuedTextField() {
    /* Check if the field already exists. */
    request(solr.hostAndCore + '/schema/dynamicFields/*_txts_en', function (error, response) {
        if (error) {
            throw('Could not check existence of Solr field: ' + error);
        }
        if (response.statusCode === 404) {
            request.post({
                url: solr.hostAndCore + '/schema', json: {
                    'add-dynamic-field': {
                        'name': '*_txts_en',
                        'type': 'text_en',
                        'stored': true,
                        'indexed': true,
                        'multiValued': true
                    }
                }
            }, function (error) {
                if (error) {
                    throw('Could not add Solr field: ' + error);
                } else {
                    console.debug('Successfully added Solr field');
                }
            });
        }
    });
}


module.exports = {
    hostAndCore: hostAndCore,
    qf: qf,
    escape: escape,
    clearIndex: clearIndex,
    addMultiValuedTextField: addMultiValuedTextField
};
