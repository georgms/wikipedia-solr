const solrHostAndCore = 'http://172.17.0.1:8983/solr/gettingstarted';
const qf = 'title_txt_en headings_txt_en categories_txts_en opening_text_txt_en text_txt_en';

function escape(string) {
    return string.replace(/"/, '\"');
}

module.exports = {
    hostAndCore: solrHostAndCore,
    qf: qf,
    escape: escape
};
