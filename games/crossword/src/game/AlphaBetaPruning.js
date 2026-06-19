import { GameUtils } from '../utils/gameUtils.js';
import { MCTSNode, mctsSearch } from './AIPlayer.js';

/**
 * AlphaBetaPruning - Alpha-Beta剪枝算法
 * 用于AI玩家选择最佳字母和位置
 */
export class AlphaBetaPruning {
    constructor(validWords, maxDepth = 5, useFeatures = false) {
        this.validWords = validWords;
        this.maxDepth = maxDepth;
        this.transpositionTable = {};
        this.useFeatures = useFeatures;
        this.letterWeights = {
            'A': 0.12, 'E': 0.13, 'I': 0.10, 'O': 0.09, 'U': 0.05,
            'S': 0.08, 'T': 0.07, 'R': 0.07, 'N': 0.07, 'L': 0.06,
            'D': 0.05, 'C': 0.04, 'M': 0.04, 'P': 0.04, 'H': 0.03,
            'G': 0.03, 'B': 0.02, 'F': 0.02, 'W': 0.02, 'Y': 0.02,
            'K': 0.01, 'V': 0.01, 'X': 0.005, 'J': 0.005, 'Q': 0.002, 'Z': 0.002
        };
        this.commonPrefixes = {};
        this.commonSuffixes = {};
        this.gridFeatures = {};
        
        // 异步加载特征文件
        this._loadFeatures();
    }

    async _loadFeatures() {
        try {
            const affixResponse = await fetch('common_affixes.json');
            const affixes = await affixResponse.json();
            this.commonPrefixes = affixes.prefixes || {};
            this.commonSuffixes = affixes.suffixes || {};
        } catch (e) {
            console.log('Warning: common_affixes.json not found. Prefix/suffix rewards disabled.');
        }

        if (this.useFeatures) {
            try {
                const featureResponse = await fetch('grid_features.json');
                this.gridFeatures = await featureResponse.json();
            } catch (e) {
                console.log('Warning: grid_features.json not found. Feature-based scoring disabled.');
            }
        }
    }

    getBestLetter(playerBoard, opponentBoard) {
        const letterScores = {};
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        
        for (const letter of alphabet) {
            const weight = this.letterWeights[letter] || 0.01;
            const featureScore = this.useFeatures 
                ? (this.gridFeatures.letter_frequencies?.[letter] || 0) * 10 
                : 0;
            letterScores[letter] = weight + featureScore;
        }

        const topLetters = Object.entries(letterScores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([letter]) => letter);

        let bestLetter = null;
        let bestScore = -Infinity;
        let alpha = -Infinity;
        const beta = Infinity;
        
        const emptyPositions = [];
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (playerBoard[r][c] === ' ') {
                    emptyPositions.push([r, c]);
                }
            }
        }
        
        const remainingSpaces = emptyPositions.length;
        const depth = remainingSpaces > 10 ? 2 : 3;

        for (const letter of topLetters) {
            const positionScores = [];
            const sampleCount = Math.min(3, emptyPositions.length);
            const samplePositions = emptyPositions.length > 0 
                ? this._sampleArray(emptyPositions, sampleCount)
                : [[0, 0]];
            
            for (const pos of samplePositions) {
                const [row, col] = pos;
                const newBoard = GameUtils.deepCopy(playerBoard);
                newBoard[row][col] = letter;
                const score = this._minimax(newBoard, opponentBoard, depth - 1, alpha, beta, false);
                positionScores.push(score);
                alpha = Math.max(alpha, score);
                if (alpha >= beta) break;
            }
            
            const avgScore = positionScores.length > 0 
                ? positionScores.reduce((a, b) => a + b, 0) / positionScores.length
                : -Infinity;
            
            if (avgScore > bestScore) {
                bestScore = avgScore;
                bestLetter = letter;
            }
            
            alpha = Math.max(alpha, bestScore);
            if (bestScore > beta * 0.95) break;
        }

        return bestLetter || this._randomChoice(alphabet.split(''));
    }

    _sampleArray(arr, count) {
        const shuffled = [...arr].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }

    _randomChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    calculateFeatureSimilarity(board) {
        if (!this.useFeatures || !Object.keys(this.gridFeatures).length) return 0;

        let letterScore = 0;
        let positionalScore = 0;
        let wordScore = 0;

        const boardLetters = [];
        for (const row of board) {
            for (const cell of row) {
                if (cell !== ' ') boardLetters.push(cell);
            }
        }

        const boardLetterFreq = {};
        for (const letter of boardLetters) {
            boardLetterFreq[letter] = (boardLetterFreq[letter] || 0) + 1;
        }

        const totalBoardLetters = boardLetters.length;
        if (totalBoardLetters > 0) {
            for (const [letter, freq] of Object.entries(boardLetterFreq)) {
                const expectedFreq = this.gridFeatures.letter_frequencies?.[letter] || 0;
                letterScore += Math.abs(freq / totalBoardLetters - expectedFreq);
            }
        }

        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 5; j++) {
                if (board[i][j] !== ' ') {
                    const expectedFreq = this.gridFeatures.positional_frequencies?.[i]?.[j]?.[board[i][j]] || 0;
                    positionalScore += expectedFreq;
                }
            }
        }

        for (let i = 0; i < 5; i++) {
            const rowWord = board[i].join('').trim();
            if (this.gridFeatures.common_row_words?.[rowWord]) {
                wordScore += this.gridFeatures.common_row_words[rowWord];
            }
            const colWord = board.map(row => row[i]).join('').trim();
            if (this.gridFeatures.common_col_words?.[colWord]) {
                wordScore += this.gridFeatures.common_col_words[colWord];
            }
        }

        return (1 - letterScore) * 20 + positionalScore * 50 + wordScore * 30;
    }

    _evaluateBoard(playerBoard, opponentBoard) {
        let totalScore = 0;
        let bonus = 0;
        
        // 检查行
        for (const row of playerBoard) {
            const rowLetters = row.join('').trim();
            if (rowLetters.length === 5 && this.validWords.has(rowLetters)) {
                bonus += 50;
            }
            for (let start = 0; start < 5; start++) {
                for (let end = start + 3; end <= 5; end++) {
                    if (start >= 0 && end <= 5) {
                        const subWord = rowLetters.substring(start, end).trim();
                        if (this.validWords.has(subWord)) {
                            if (subWord.length === 5) {
                                totalScore += Math.pow(subWord.length, 3) * 1.5;
                            } else if (subWord.length === 3) {
                                totalScore += Math.pow(subWord.length, 2) * 0.5;
                            } else {
                                totalScore += Math.pow(subWord.length, 2);
                            }
                        }
                    }
                }
            }
        }
        
        // 检查列
        for (let col = 0; col < 5; col++) {
            const colLetters = playerBoard.map(row => row[col]).join('').trim();
            if (colLetters.length === 5 && this.validWords.has(colLetters)) {
                bonus += 50;
            }
            for (let start = 0; start < 5; start++) {
                for (let end = start + 3; end <= 5; end++) {
                    if (start >= 0 && end <= 5) {
                        const subWord = colLetters.substring(start, end).trim();
                        if (this.validWords.has(subWord)) {
                            if (subWord.length === 5) {
                                totalScore += Math.pow(subWord.length, 3) * 1.5;
                            } else if (subWord.length === 3) {
                                totalScore += Math.pow(subWord.length, 2) * 0.5;
                            } else {
                                totalScore += Math.pow(subWord.length, 2);
                            }
                        }
                    }
                }
            }
        }
        
        const affixBonus = this._calculateAffixBonus(playerBoard);
        let centralBonus = 0;
        for (let r = 1; r < 4; r++) {
            for (let c = 1; c < 4; c++) {
                if (playerBoard[r][c] !== ' ') centralBonus++;
            }
        }
        
        let expansionPotential = 0;
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (playerBoard[r][c] !== ' ') {
                    expansionPotential += this._calculateExpansionPotential(playerBoard, r, c);
                }
            }
        }
        
        const featureSimilarityBonus = this.useFeatures ? this.calculateFeatureSimilarity(playerBoard) : 0;
        
        return totalScore + bonus + affixBonus + centralBonus * 5 + expansionPotential * 2 + featureSimilarityBonus;
    }

    getBestMove(playerBoard, opponentBoard, letter) {
        const emptyPositions = [];
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (playerBoard[r][c] === ' ') {
                    emptyPositions.push([r, c]);
                }
            }
        }
        if (emptyPositions.length === 0) return [0, 0];

        let remainingSpaces = 0;
        for (const row of playerBoard) {
            for (const cell of row) {
                if (cell === ' ') remainingSpaces++;
            }
        }
        
        let depth;
        if (remainingSpaces > 15) depth = 5;
        else if (remainingSpaces > 5) depth = 4;
        else depth = 3;

        const results = [];
        for (const pos of emptyPositions) {
            const result = this._evaluatePosition(playerBoard, opponentBoard, letter, pos, depth);
            results.push(result);
        }

        const bestScore = Math.max(...results.map(r => r[1]));
        const bestMoves = results.filter(r => r[1] === bestScore).map(r => r[0]);
        return this._randomChoice(bestMoves);
    }

    _evaluatePosition(playerBoard, opponentBoard, letter, pos, depth) {
        const newBoard = GameUtils.deepCopy(playerBoard);
        const [row, col] = pos;
        newBoard[row][col] = letter;
        
        const alphaBetaScore = this._minimax(newBoard, opponentBoard, depth, -Infinity, Infinity, false);
        const mctsRoot = new MCTSNode(newBoard);
        mctsSearch(mctsRoot, this.validWords, 200);
        const mctsScore = mctsRoot.visits > 0 ? mctsRoot.value / mctsRoot.visits : 0;
        
        const totalScore = 0.7 * alphaBetaScore + 0.3 * mctsScore;
        return [pos, totalScore];
    }

    _minimax(playerBoard, opponentBoard, depth, alpha, beta, isMaximizing) {
        const boardHash = this._hashBoard(playerBoard);
        if (boardHash in this.transpositionTable) {
            return this.transpositionTable[boardHash];
        }

        // Check if board is full or depth is 0 (terminal state)
        const playerHasEmpty = playerBoard.some(row => row.some(cell => cell === ' '));
        if (depth === 0 || !playerHasEmpty) {
            const score = this._evaluateBoard(playerBoard, opponentBoard);
            this.transpositionTable[boardHash] = score;
            return score;
        }

        if (isMaximizing) {
            let maxEval = -Infinity;
            const emptyPositions = [];
            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < 5; c++) {
                    if (playerBoard[r][c] === ' ') emptyPositions.push([r, c]);
                }
            }
            if (emptyPositions.length === 0) {
                const score = this._evaluateBoard(playerBoard, opponentBoard);
                this.transpositionTable[boardHash] = score;
                return score;
            }
            // Sample positions when too many to reduce branching factor
            if (emptyPositions.length > 4) {
                emptyPositions.sort(() => Math.random() - 0.5);
                emptyPositions.splice(4);
            }
            const testLetter = this._randomChoice(['E', 'T', 'A', 'O', 'I', 'N']);
            for (const [row, col] of emptyPositions) {
                const newBoard = GameUtils.deepCopy(playerBoard);
                newBoard[row][col] = testLetter;
                const evalScore = this._minimax(newBoard, opponentBoard, depth - 1, alpha, beta, false);
                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) break;
            }
            this.transpositionTable[boardHash] = maxEval;
            return maxEval;
        } else {
            let minEval = Infinity;
            const emptyPositions = [];
            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < 5; c++) {
                    if (opponentBoard[r][c] === ' ') emptyPositions.push([r, c]);
                }
            }
            if (emptyPositions.length === 0) {
                const score = this._evaluateBoard(playerBoard, opponentBoard);
                this.transpositionTable[boardHash] = score;
                return score;
            }
            // Sample positions when too many to reduce branching factor
            if (emptyPositions.length > 4) {
                emptyPositions.sort(() => Math.random() - 0.5);
                emptyPositions.splice(4);
            }
            const testLetter = this._randomChoice(['E', 'T', 'A', 'O', 'I', 'N']);
            for (const [row, col] of emptyPositions) {
                const newBoard = GameUtils.deepCopy(opponentBoard);
                newBoard[row][col] = testLetter;
                const evalScore = this._minimax(playerBoard, newBoard, depth - 1, alpha, beta, true);
                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                if (beta <= alpha) break;
            }
            this.transpositionTable[boardHash] = minEval;
            return minEval;
        }
    }

    _hashBoard(board) {
        return board.map(row => row.join('')).join('|');
    }

    _calculateAffixBonus(board) {
        let bonus = 0;
        return bonus;
    }

    _calculateExpansionPotential(board, row, col) {
        let potential = 0;
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (const [dr, dc] of directions) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5 && board[nr][nc] === ' ') {
                potential++;
            }
        }
        return potential;
    }
}