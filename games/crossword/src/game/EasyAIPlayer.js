import { AIPlayer } from './AIPlayer.js';
import { AlphaBetaPruning } from './AlphaBetaPruning.js';

// 工具函数：深拷贝
function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// 工具函数：随机选择数组元素
function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

export class EasyAIPlayer extends AIPlayer {
    constructor(validWords) {
        super();
        this.abPruning = new AlphaBetaPruning(validWords, 6);
        this.validWords = validWords;
        this.letterFreq5Words = this._buildLetterFrequencyFor5LetterWords();
        this.commonLetters = Object.keys(this.letterFreq5Words)
            .sort((a, b) => this.letterFreq5Words[b] - this.letterFreq5Words[a])
            .slice(0, 10);
    }

    _buildLetterFrequencyFor5LetterWords() {
        /**统计所有5字母单词中字母出现频率*/
        const freq = {};
        for (const word of this.validWords) {
            if (word.length === 5) {
                const uniqueLetters = new Set(word.split(''));
                for (const letter of uniqueLetters) {
                    freq[letter] = (freq[letter] || 0) + 1;
                }
            }
        }
        return freq;
    }

    choose_letter(game) {
        const myBoard = game.players_boards[1];
        const bestLetter = this._chooseLetterBy5WordPotential(myBoard);
        game.set_current_letter(bestLetter);
        game.add_game_record(1, bestLetter, null);
        console.log(`Easy AI 选择字母: ${bestLetter}`);
    }

    _chooseLetterBy5WordPotential(board) {
        /**选择最有潜力形成5字母单词的字母*/
        const emptyPositions = [];
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (board[r][c] === ' ') {
                    emptyPositions.push([r, c]);
                }
            }
        }

        const letterScores = {};
        for (const letter of this.commonLetters) {
            let potentialScore = 0;
            for (const [r, c] of emptyPositions) {
                const tempBoard = deepCopy(board);
                tempBoard[r][c] = letter;
                const score = this._score5LetterPotential(tempBoard);
                potentialScore += score;
            }
            letterScores[letter] = potentialScore;
        }

        let bestLetter = this.commonLetters[0];
        let bestScore = -Infinity;
        for (const [letter, score] of Object.entries(letterScores)) {
            if (score > bestScore) {
                bestScore = score;
                bestLetter = letter;
            }
        }
        return bestLetter;
    }

    place_letter(game) {
        const currentLetter = game.get_current_letter();
        const myBoard = game.players_boards[1];
        const opponentBoard = game.players_boards[0];

        // 增加深度偏好，强调 long-term payoff
        this.abPruning.maxDepth = 6;
        const [row, col] = this._best5WordFocusedPlacement(myBoard, opponentBoard, currentLetter);
        if (game.set_temp_placement(1, row, col, currentLetter)) {
            console.log(`Easy AI 放置字母 ${currentLetter} 在 行=${row}, 列=${col}`);
        } else {
            console.log("Easy AI 放置失败");
        }
    }

    _best5WordFocusedPlacement(board, opponentBoard, letter) {
        const emptyPositions = [];
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (board[r][c] === ' ') {
                    emptyPositions.push([r, c]);
                }
            }
        }

        const scoredPositions = [];
        for (const [r, c] of emptyPositions) {
            const tempBoard = deepCopy(board);
            tempBoard[r][c] = letter;
            const lineScore = this._score5LetterPotential(tempBoard);
            const abScore = this.abPruning._evaluateBoard(tempBoard, opponentBoard);
            const finalScore = lineScore * 2.0 + abScore; // 强调形成5字母词的价值
            scoredPositions.push({ pos: [r, c], score: finalScore });
        }

        if (scoredPositions.length === 0) {
            return [0, 0];
        }

        scoredPositions.sort((a, b) => b.score - a.score);
        return scoredPositions[0].pos;
    }

    _score5LetterPotential(board) {
        /**评估棋盘上当前可能形成的5字母词的潜力分数*/
        let score = 0;
        for (let i = 0; i < 5; i++) {
            const row = board[i].join('');
            const col = board.map(r => r[i]).join('');
            score += this._scoreLineFor5Letter(row);
            score += this._scoreLineFor5Letter(col);
        }
        return score;
    }

    _scoreLineFor5Letter(line) {
        /**针对一行/一列打分（基于形成5字母词潜力）*/
        if (line.length !== 5) {
            return 0;
        }
        const filled = line.split('').filter(ch => ch !== ' ').length;
        if (filled < 3) {
            return 0; // 太短无潜力
        }
        const possibleMatches = this._generatePossibleWordsFromPattern(line);
        return possibleMatches.length * (filled === 4 ? 10 : 3);
    }

    _generatePossibleWordsFromPattern(pattern) {
        /**根据模式（如 "A C E"）生成可能匹配的单词*/
        const matches = [];
        for (const word of this.validWords) {
            if (word.length !== 5) continue;
            let match = true;
            for (let i = 0; i < 5; i++) {
                if (pattern[i] !== ' ' && pattern[i] !== word[i]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                matches.push(word);
            }
        }
        return matches;
    }
}