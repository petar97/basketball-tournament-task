const fs = require('fs');

const groups = JSON.parse(fs.readFileSync('data/groups.json'));

function simulateGroupStage(groups) {
    const groupResults = {};

    for (const group in groups) {
        const teams = groups[group];
        const results = [];

        const standings = teams.map((team) => ({
            name: team.Team,
            code: team.ISOCode,
            rank: team.FIBARanking,
            wins: 0,
            losses: 0,
            points: 0,
            scoredPoints: 0,
            concededPoints: 0,
            pointDifference: 0,
        }));

        for (let i = 0; i < standings.length; i++) {
            for (let j = i + 1; j < standings.length; j++) {
                const team1 = standings[i];
                const team2 = standings[j];

                const [team1Score, team2Score] = simulateMatch(team1, team2);

                if (team1Score > team2Score) {
                    team1.wins++;
                    team1.points += 2;
                    team2.losses++;
                    team2.points += 1;
                } else {
                    team2.wins++;
                    team2.points += 2;
                    team1.losses++;
                    team1.points += 1;
                }

                team1.scoredPoints += team1Score;
                team1.concededPoints += team2Score;
                team1.pointDifference += team1Score - team2Score;

                team2.scoredPoints += team2Score;
                team2.concededPoints += team1Score;
                team2.pointDifference += team2Score - team1Score;

                results.push({
                    team1: team1.name,
                    team2: team2.name,
                    score: `${team1Score} : ${team2Score}`,
                });
            }
        }

        standings.sort((a, b) => {
            if (b.points === a.points) {
                if (b.pointDifference === a.pointDifference) {
                    return b.scoredPoints - a.scoredPoints;
                }
                return b.pointDifference - a.pointDifference;
            }
            return b.points - a.points;
        });

        groupResults[group] = {
            results,
            standings,
        };
    }
    return groupResults;
}

function simulateMatch(team1, team2) {
    const rankDifference = team1.rank - team2.rank;

    const baseScore = 70;
    const randomFactor1 = Math.random() * 15;
    const randomFactor2 = Math.random() * 15;

    const team1Score = Math.round(baseScore - rankDifference + randomFactor1);
    const team2Score = Math.round(baseScore + rankDifference + randomFactor2);

    return [team1Score, team2Score];
}

const groupStageResults = simulateGroupStage(groups);

for (const group in groupStageResults) {
    console.log(`Grupa ${group}`);
    console.log(`Rezultati za grupu:`);
    groupStageResults[group].results.forEach((match) => {
        console.log(`    ${match.team1} - ${match.team2} (${match.score})`);
    });
    console.log('\n');
    console.log(`   Konačan plasman:`);
    console.log(
        `   (Ime - pobede/porazi/bodovi/postignuti koševi/primljeni koševi/koš razlika):`
    );
    groupStageResults[group].standings.forEach((team, index) => {
        console.log(
            `       ${index + 1}. ${team.name}
            ${team.wins} / ${team.losses} / ${team.points} / ${
                team.scoredPoints
            } / ${team.concededPoints} / ${team.pointDifference}`
        );
    });
    console.log('\n');
}

function drawQuarterfinals(groupStageResults) {
    const rankedTeams = rankTeams(groupStageResults);

    const potD = [rankedTeams[0], rankedTeams[1]];
    const potE = [rankedTeams[2], rankedTeams[3]];
    const potF = [rankedTeams[4], rankedTeams[5]];
    const potG = [rankedTeams[6], rankedTeams[7]];

    const quarterfinalPairs = [];

    function tryPairing(pot1, pot2, remainingPairs = []) {
        if (pot1.length === 0 && pot2.length === 0) {
            return remainingPairs;
        }

        for (let i = 0; i < pot1.length; i++) {
            for (let j = 0; j < pot2.length; j++) {
                const team1 = pot1[i];
                const team2 = pot2[j];

                if (team1.group !== team2.group) {
                    const newPot1 = pot1.slice(0, i).concat(pot1.slice(i + 1));
                    const newPot2 = pot2.slice(0, j).concat(pot2.slice(j + 1));
                    const result = tryPairing(newPot1, newPot2, [
                        ...remainingPairs,
                        { team1, team2 },
                    ]);

                    if (result) {
                        return result;
                    }
                }
            }
        }
        return null;
    }

    function generateQuarterfinalPairs() {
        const pairsDvsG = tryPairing(potD, potG);
        const pairsEvsF = tryPairing(potE, potF);

        if (pairsDvsG && pairsEvsF) {
            return [...pairsDvsG, ...pairsEvsF];
        }
        return null;
    }

    while (quarterfinalPairs.length < 4) {
        const pairs = generateQuarterfinalPairs();

        if (pairs) {
            quarterfinalPairs.push(...pairs);
        } else {
            potD.push(...rankedTeams.slice(0, 2));
            potE.push(...rankedTeams.slice(2, 4));
            potF.push(...rankedTeams.slice(4, 6));
            potG.push(...rankedTeams.slice(6, 8));
            quarterfinalPairs.length = 0;
        }
    }

    return quarterfinalPairs;
}

function rankTeams(groupStageResults) {
    const rankedTeams = [];

    for (const group in groupStageResults) {
        const standings = groupStageResults[group].standings;
        for (let i = 0; i < standings.length; i++) {
            const team = standings[i];
            team.group = group;
            rankedTeams.push(team);
        }
    }

    rankedTeams.sort((a, b) => {
        if (a.points === b.points) {
            if (a.pointDifference === b.pointDifference) {
                return b.scoredPoints - a.scoredPoints;
            }
            return b.pointDifference - a.pointDifference;
        }
        return b.points - a.points;
    });

    return rankedTeams;
}

const quarterfinalPairs = drawQuarterfinals(groupStageResults);

console.log('Parovi četvrtfinala:');
quarterfinalPairs.forEach((pair) => {
    console.log(`    ${pair.team1.name} - ${pair.team2.name}`);
});

function simulateEliminationStage(quarterfinalPairs) {
    function simulateMatch(team1, team2) {
        const team1Strength = team1.rank + Math.random() * 0.5;
        const team2Strength = team2.rank + Math.random() * 0.5;

        const team1Score = Math.floor(70 + Math.random() * 30 + team1Strength);
        const team2Score = Math.floor(70 + Math.random() * 30 + team2Strength);

        if (team1Score > team2Score) {
            return {
                winner: team1,
                loser: team2,
                score: `${team1Score}:${team2Score}`,
            };
        } else {
            return {
                winner: team2,
                loser: team1,
                score: `${team2Score}:${team1Score}`,
            };
        }
    }

    const semifinalists = [];
    const quarterfinalResults = [];

    console.log('Četvrtfinale:');
    quarterfinalPairs.forEach((pair) => {
        const result = simulateMatch(pair.team1, pair.team2);
        semifinalists.push(result.winner);
        quarterfinalResults.push(result);
        console.log(
            `${result.winner.name} - ${result.loser.name} (${result.score})`
        );
    });

    const finalists = [];
    const thirdPlaceCandidates = [];
    const semifinalResults = [];

    console.log('\nPolufinale:');
    for (let i = 0; i < 2; i++) {
        const result = simulateMatch(
            semifinalists[2 * i],
            semifinalists[2 * i + 1]
        );
        finalists.push(result.winner);
        thirdPlaceCandidates.push(result.loser);
        semifinalResults.push(result);
        console.log(
            `${result.winner.name} - ${result.loser.name} (${result.score})`
        );
    }

    console.log('\nUtakmica za treće mesto:');
    const thirdPlaceResult = simulateMatch(
        thirdPlaceCandidates[0],
        thirdPlaceCandidates[1]
    );
    console.log(
        `${thirdPlaceResult.winner.name} - ${thirdPlaceResult.loser.name} (${thirdPlaceResult.score})`
    );

    console.log('\nFinale:');
    const finalResult = simulateMatch(finalists[0], finalists[1]);
    console.log(
        `${finalResult.winner.name} - ${finalResult.loser.name} (${finalResult.score})`
    );

    console.log('\nMedalje:');
    console.log(`1. ${finalResult.winner.name}`);
    console.log(`2. ${finalResult.loser.name}`);
    console.log(`3. ${thirdPlaceResult.winner.name}`);
}

function startTournament() {
    const groupResults = simulateGroupStage(groups);
    const quarterfinalDraw = drawQuarterfinals(groupResults);
    simulateEliminationStage(quarterfinalDraw);
}

startTournament();
