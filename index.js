const fs = require('fs');
const readline = require('readline');
const request = require('request-promise');
const RequestQueue = require('limited-request-queue');

const inputFile = 'simplewiki.json';
const batchSize = 1000;

const solr = require('./solr');

function run() {
    solr.ensureMultiValuedTextFieldExists().then(solr.clearIndex).then(readAndImportFiles(inputFile, batchSize));
}

function defer() {
    let deferred = {
        promise: null,
        resolve: null,
        reject: null
    };

    deferred.promise = new Promise((resolve, reject) => {
        deferred.resolve = resolve;
        deferred.reject = reject;
    });

    return deferred;
}

function readAndImportFiles(inputFile, batchSize) {
    const rl = readline.createInterface({
        input: fs.createReadStream(inputFile)
    });

    let queue = constructQueue();

    let pages = [];

    let counter = 0;

    let readPromise = defer();

    rl.on('line', (line) => {
        const data = JSON.parse(line);

        /* The Wikipedia dump also contains index entries. Skip these. */
        if (data.index) {
            return;
        }

        counter++;

        let page = buildSolrDocument(data);
        pages.push(page);
        if (pages.length % batchSize === 0) {
            console.log(`Pushing ${pages.length} documents, now at ${counter}.`);
            queue.enqueue({
                url: solr.hostAndCore + '/update/json/docs?commitWithin=10000&overwrite=true&wt=json',
                json: pages
            });
            pages = [];
        }
    }).on('close', () => {
        console.log(`Done reading input, pushing remaining ${pages.length} documents.`);
        queue.enqueue({
            url: solr.hostAndCore + '/update/json/docs?commitWithin=10000&overwrite=true&wt=json',
            json: pages
        });

        /*
         * We have to wait for the queue to finish before the promise is resolved.
         *
         * However, the queue may seem to have finished before that if the current requests are already handled but no
         * new requests have been pushed onto the queue; then handlers.end would be called prematurely. To avoid this
         * only install the handler after the last elements have been enqueued.
         *
         */
        queue.handlers.end = (() => {
            console.log('Request queue completed.');
            readPromise.resolve();
        });
    });


    return readPromise.promise;
}

function constructQueue() {

    return new RequestQueue({maxSockets: 16}, {
        item: function (input, done) {
            request({
                url: input.url, json: input.json
            }).then((data) => {

                //console.debug('Successfully added ' + input.json.title_txt_en);
                done();
            }).catch((error) => {
                throw(error);
            });
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
    /* Build a catch-all column for spellchecking */
    page._text_ = [data.title, data.opening_text || '', data.text, data.heading, data.category].join(' ');

    return page;
}

module.exports = {
    run: run,
    readAndImportFiles: readAndImportFiles
};