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

function ensureMultiValuedTextFieldExists() {
    /* Check if the field already exists. */
    return request({
        url: hostAndCore + '/schema/dynamicfields/*_txts_en',
        simple: false,
        resolveWithFullResponse: true,
        json: true
    }).then((response) => {
        if (response.statusCode === 404) {
            return addMultiValuedTextField();
        }
    }).catch((error) => {
        throw('Could not check existence of Solr field: ' + error);
    });
}

function addMultiValuedTextField() {
    return request.post({
        url: hostAndCore + '/schema', json: {
            'add-dynamic-field': {
                'name': '*_txts_en',
                'type': 'text_en',
                'stored': true,
                'indexed': true,
                'multiValued': true
            }
        }
    }).then(() => {
        console.debug('Successfully added Solr field');
    }).catch((error) => {
        console.error('Bla');
        throw('Could not add Solr field: ' + error);
    });
}


module.exports = {
    hostAndCore: hostAndCore,
    qf: qf,
    escape: escape,
    clearIndex: clearIndex,
    ensureMultiValuedTextFieldExists: ensureMultiValuedTextFieldExists
};
