const fs = require('fs');
const path = require('path');
const readline = require('readline');
const request = require('request');

const inputFile = 'simplewiki.json';
const outputDir = 'output';

const solrHostAndCore = 'http://172.17.0.1:8983/solr/gettingstarted';

addMultiValuedTextFieldToSolr();

clearSolr();

clearDirectory(outputDir);

readFiles();

function addMultiValuedTextFieldToSolr() {
    /* Check if the field already exists. */
    request(solrHostAndCore + '/schema/dynamicFields/*_txts_en', function (error, response) {
        if (error) {
            throw('Could not check existence of Solr field: ' + error);
        }
        if (response.statusCode === 404) {
            request.post({
                url: solrHostAndCore + '/schema', json: {
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
        url: solrHostAndCore + '/update?commitWithin=1000&overwrite=true&wt=json',
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

function clearDirectory(directory) {
    fs.readdir(directory, (err, files) => {
        if (err) throw err;

        for (const file of files) {
            fs.unlink(path.join(directory, file), err => {
                if (err) throw err;
            });
        }
    });
}

function readFiles() {
    const rl = readline.createInterface({
        input: fs.createReadStream(inputFile)
    });

    rl.on('line', function (line) {
        const data = JSON.parse(line);

        /* The Wikipedia dump also contains index entries. Skip these. */
        if (data.index) {
            return;
        }

        const page = {};
        page.id = data.wikibase_item;
        page.title_txt_en = data.title;
        /* The opening text does not exist for all pages. */
        page.opening_text_txt_en = data.opening_text || '';
        page.text_txt_en = data.text;
        page.headings_txt_en = data.heading;
        page.popularity_score_d = data.popularity_score;
        page.last_updated_dt = data.timestamp;
        /* Add two fields categories, once for searching and once for faceting. */
        page.categories_txts_en = data.category;
        page.categories_ss = data.category;

        request.post({
                url: solrHostAndCore + '/update/json/docs?commitWithin=1000&overwrite=true&wt=json',
                json: page
            },
            function (error) {
                if (error) {
                    throw('Could not add ' + page.title_txt_en + ': ' + error);
                } else {
                    console.info('Successfully added ' + page.title_txt_en);
                }
            });

        /* Replace directory delimiter '/' in filename. */
        let filename = page.title_txt_en.replace(/\//g, '_');

        const outputFile = outputDir + '/' + filename + '.json';
        fs.writeFile(outputFile, JSON.stringify(page, null, 2), (err) => {
            if (err) {
                throw err;
            }
        });
        console.debug('Wrote ' + outputFile);
    });
}
