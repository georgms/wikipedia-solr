const fs = require('fs');
const path = require('path');
const readline = require('readline');

const inputFile = 'simplewiki.json';
const outputDir = 'output';

clearDirectory(outputDir);

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
    page.title_txt_en = data.title;
    /* The opening text does not exist for all pages. */
    page.opening_text_txt_en = data.opening_text || '';
    page.text_txt_en = data.text;
    page.headings_txt_en = data.heading;
    page.popularity_score_d = data.popularity_score;
    page.last_updated_dt = data.timestamp;
    /* Add two fields categories, once for searching and once for faceting. */
    page.categories_txt_en = data.category;
    page.attr_categories = data.category;

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
