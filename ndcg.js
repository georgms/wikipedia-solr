function calculateGradedRelevance(idealRanking) {
    let gradedRelevance = {};

    for (let i = 0; i < idealRanking.length; i++) {
        let result = idealRanking[i];
        /* Set relevance to 100, 50, 33 … */
        gradedRelevance[result] = 100 / (i + 1);
    }

    return gradedRelevance;
}

function calculateDcg(actualRanking, gradedRelevance) {
    let dcg = 0;

    for (let i = 0; i < actualRanking.length; i++) {
        let result = actualRanking[i];
        let relevance = gradedRelevance[result] || 0;
        dcg += (Math.pow(2, relevance) - 1) / Math.log2(i + 2);
    }

    return dcg;
}

function calculateNdcg(actualRanking, idealRanking) {
    let gradedRelevance = calculateGradedRelevance(idealRanking);
    let idcg = calculateDcg(idealRanking, gradedRelevance);
    let dcg = calculateDcg(actualRanking, gradedRelevance);
    return dcg / idcg;
}

module.exports = {
    calculate: calculateNdcg
};