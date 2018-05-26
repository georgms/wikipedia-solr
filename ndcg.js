function calculateGradedRelevance(idealRanking, cutOff = 10) {
    let gradedRelevance = {};

    for (let i = 0; i < Math.min(idealRanking.length, cutOff); i++) {
        let result = idealRanking[i];
        /* Set relevance to 100, 50, 33 … */
        gradedRelevance[result] = 100 / (i + 1);
    }

    return gradedRelevance;
}

function calculateDcg(actualRanking, gradedRelevance, cutOff = 10) {
    let dcg = 0;

    for (let i = 0; i < Math.min(actualRanking.length, cutOff); i++) {
        let result = actualRanking[i];
        let relevance = gradedRelevance[result] || 0;
        dcg += (Math.pow(2, relevance) - 1) / Math.log2(i + 2);
    }

    return dcg;
}

function calculateNdcg(actualRanking, idealRanking, cutOff = 10) {
    let gradedRelevance = calculateGradedRelevance(idealRanking, cutOff);
    let idcg = calculateDcg(idealRanking, gradedRelevance, cutOff);
    let dcg = calculateDcg(actualRanking, gradedRelevance, cutOff);
    return dcg / idcg;
}

module.exports = {
    calculate: calculateNdcg
};