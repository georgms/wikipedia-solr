const fs = require('fs');
const readline = require('readline');
const request = require('request');
const RequestQueue = require("limited-request-queue");

const inputFile = 'simplewiki-20180514-cirrussearch-content.json';

const solr = require('./solr');

addMultiValuedTextFieldToSolr();

clearSolr();
readFiles();

function addMultiValuedTextFieldToSolr() {
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

function clearSolr() {
    request.post({
        url: solr.hostAndCore + '/update?commitWithin=1000&overwrite=true&wt=json',
        headers: {'Content-Type': 'text/xml'},
        body:
            '<add><delete><query>*:*</query></delete></add>'
    }, function (error) {
        if (error) {
            throw('Could not clear Solr: ' + error);
        } else {
            console.debug('Successfully cleared Solr');
        }
    });
}

function readFiles() {
    const rl = readline.createInterface({
        input: fs.createReadStream(inputFile)
    });

    let queue = constructQueue();

    let pages = [];

    let counter = 0;

    rl.on('line', (line) => {
        const data = JSON.parse(line);

        /* The Wikipedia dump also contains index entries. Skip these. */
        if (data.index) {
            return;
        }

        counter++;

        let page = buildSolrDocument(data);
        pages.push(page);
        if (pages.length % 1000 === 0) {
            console.log(`Pushing ${pages.length} documents, now at ${counter}.`);
            queue.enqueue({
                url: solr.hostAndCore + '/update/json/docs?commitWithin=10000&overwrite=true&wt=json',
                json: pages
            });
            pages = [];
        }
    }).on('close', () => {
        queue.enqueue({
            url: solr.hostAndCore + '/update/json/docs?commitWithin=10000&overwrite=true&wt=json',
            json: pages
        });
    })
}

function constructQueue() {
    let counter = 0;

    return new RequestQueue({maxSockets: 16}, {
        item: function (input, done) {
            request({url: input.url, json: input.json}, function (error) {
                if (error) {
                    throw('Could not add ' + input.json.title_txt_en + ': ' + error);
                }

                if (counter % 1000 === 0) {
                    console.info(`${counter} docs added.`);
                }
                counter++;

                //console.debug('Successfully added ' + input.json.title_txt_en);
                done();
            });
        },
        end: function () {
            console.log('Queue completed!');
        }
    });
}

function buildSolrDocument(data) {
    const page = {};

    page.id = data.wikibase_item;
    page.title_txt_en = data.title;
    page.title_exact_s = data.title;
    page.title_exact_s_lower = data.title;
    /* The opening text does not exist for all pages. */
    page.opening_text_txt_en = data.opening_text || '';
    page.text_txt_en = data.text;
    page.headings_txt_en = data.heading;
    page.popularity_score_d = data.popularity_score;
    page.last_updated_dt = data.timestamp;
    /* Add two fields categories, once for searching and once for faceting. */
    page.categories_txts_en = data.category;
    page.categories_ss = data.category;

    return page;
}
