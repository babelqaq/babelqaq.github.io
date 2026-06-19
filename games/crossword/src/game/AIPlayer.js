/**
 * AIPlayer.js - 填字游戏AI模块
 * 包含AlphaBetaPruning、MCTS、高分模式分析器以及三个难度级别的AI玩家
 */

// 工具函数：深拷贝
function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// 工具函数：随机选择数组元素
function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// 工具函数：计算方差
function calculateVariance(numbers) {
    if (numbers.length <= 1) return 0;
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / (numbers.length - 1);
}

// 工具函数：生成棋盘哈希
function generateBoardHash(board1, board2) {
    const boardStr1 = board1.map(row => row.join('')).join('');
    const boardStr2 = board2.map(row => row.join('')).join('');
    return boardStr1 + boardStr2;
}

/**
 * AlphaBetaPruning - Alpha-Beta剪枝算法
 */
class AlphaBetaPruning {
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
        
        // 异步加载特征文件（在浏览器中使用fetch）
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
                const newBoard = deepCopy(playerBoard);
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

        return bestLetter || randomChoice(alphabet.split(''));
    }

    _sampleArray(arr, count) {
        const shuffled = [...arr].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
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

        // 浏览器中不支持multiprocessing，改用同步计算
        const results = [];
        for (const pos of emptyPositions) {
            const result = this._evaluatePosition(playerBoard, opponentBoard, letter, pos, depth);
            results.push(result);
        }

        const bestScore = Math.max(...results.map(r => r[1]));
        const bestMoves = results.filter(r => r[1] === bestScore).map(r => r[0]);
        return randomChoice(bestMoves);
    }

    _evaluatePosition(playerBoard, opponentBoard, letter, pos, depth) {
        const newBoard = deepCopy(playerBoard);
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
        if (this.transpositionTable[boardHash]) {
            return this.transpositionTable[boardHash];
        }

        if (depth === 0) {
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
            for (const [row, col] of emptyPositions) {
                const newBoard = deepCopy(playerBoard);
                newBoard[row][col] = 'X';
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
            for (const [row, col] of emptyPositions) {
                const newBoard = deepCopy(opponentBoard);
                newBoard[row][col] = 'X';
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
        // 简化的词缀奖励计算
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

/**
 * MCTSNode - Monte Carlo树搜索节点
 */
class MCTSNode {
    constructor(board, parent = null, move = null) {
        this.board = board;
        this.parent = parent;
        this.move = move;
        this.children = [];
        this.visits = 0;
        this.value = 0;
    }

    expand(moves) {
        for (const move of moves) {
            const newBoard = deepCopy(this.board);
            const [row, col] = move;
            newBoard[row][col] = 'X';
            const child = new MCTSNode(newBoard, this, move);
            this.children.push(child);
        }
    }

    select() {
        if (this.children.length === 0) return this;
        return this.children.reduce((best, child) => {
            if (child.visits === 0) return child;
            const uctValue = child.value / child.visits + 
                Math.sqrt(2 * Math.log(this.visits) / child.visits);
            const bestUct = best.visits === 0 ? Infinity : 
                best.value / best.visits + Math.sqrt(2 * Math.log(this.visits) / best.visits);
            return uctValue > bestUct ? child : best;
        });
    }

    simulate(validWords) {
        const tempBoard = deepCopy(this.board);
        const emptyPositions = [];
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (tempBoard[r][c] === ' ') {
                    emptyPositions.push([r, c]);
                }
            }
        }
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (const [r, c] of emptyPositions) {
            tempBoard[r][c] = randomChoice(alphabet.split(''));
        }
        const evaluator = new AlphaBetaPruning(validWords);
        return evaluator._evaluateBoard(tempBoard, Array(5).fill(null).map(() => Array(5).fill(' ')));
    }

    backpropagate(result) {
        this.visits++;
        this.value += result;
        if (this.parent) {
            this.parent.backpropagate(result);
        }
    }
}

function mctsSearch(root, validWords, iterations = 200) {
    for (let i = 0; i < iterations; i++) {
        let node = root.select();
        if (node.children.length === 0) {
            const moves = [];
            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < 5; c++) {
                    if (node.board[r][c] === ' ') {
                        moves.push([r, c]);
                    }
                }
            }
            node.expand(moves);
            node = node.children.length > 0 ? randomChoice(node.children) : node;
        }
        const result = node.simulate(validWords);
        node.backpropagate(result);
    }
}

/**
 * HighScorePatternAnalyzer - 高分模式分析器
 */
class HighScorePatternAnalyzer {
    constructor() {
        this.highScoreGrids = [];
        this.openingPatterns = [];
        this.loadHighScoreData();
    }

    async loadHighScoreData() {
        const jsonFiles = ['crossword_150-200.json', 'crossword_200-250.json'];
        
        for (const filename of jsonFiles) {
            try {
                const response = await fetch(filename);
                const data = await response.json();
                if (Array.isArray(data)) {
                    this.highScoreGrids.push(...data);
                } else {
                    this.highScoreGrids.push(data);
                }
                console.log(`成功加载 ${filename}，共 ${Array.isArray(data) ? data.length : 1} 个棋局`);
            } catch (e) {
                console.log(`警告: 未找到文件 ${filename}`);
            }
        }
        
        this.analyzePatterns();
    }

    analyzePatterns() {
        if (this.highScoreGrids.length === 0) {
            console.log('警告: 未找到高分棋局数据，无法分析模式');
            return;
        }
        
        for (const gridData of this.highScoreGrids) {
            const grid = gridData.grid || [];
            const score = gridData.score || 0;
            
            if (grid.length === 5 && grid[0].length === 5) {
                const normalizedGrid = grid.map(row => 
                    row.map(cell => cell !== ' ' ? cell.toUpperCase() : ' ')
                );
                
                const openingPattern = this.extractOpeningPattern(normalizedGrid, score);
                if (openingPattern) {
                    this.openingPatterns.push(openingPattern);
                }
            }
        }
        
        this.openingPatterns.sort((a, b) => b.score - a.score);
        console.log(`分析完成，提取了 ${this.openingPatterns.length} 个起手模式`);
    }

    extractOpeningPattern(grid, score) {
        const letterPositions = {};
        const centerLetters = [];
        
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (grid[r][c] !== ' ') {
                    const letter = grid[r][c];
                    if (!letterPositions[letter]) letterPositions[letter] = [];
                    letterPositions[letter].push([r, c]);
                    
                    if (r >= 1 && r <= 3 && c >= 1 && c <= 3) {
                        centerLetters.push([letter, r, c]);
                    }
                }
            }
        }
        
        const rowPatterns = [];
        const colPatterns = [];
        
        for (let i = 0; i < 5; i++) {
            const rowWord = grid[i].join('').trim().replace(/ /g, '');
            if (rowWord.length >= 3) rowPatterns.push(rowWord);
            
            const colWord = grid.map(row => row[i]).join('').trim().replace(/ /g, '');
            if (colWord.length >= 3) colPatterns.push(colWord);
        }
        
        let totalLetters = 0;
        for (const row of grid) {
            for (const cell of row) {
                if (cell !== ' ') totalLetters++;
            }
        }
        
        return {
            score,
            grid,
            letterPositions,
            centerLetters,
            rowPatterns,
            colPatterns,
            totalLetters
        };
    }

    findBestOpeningMove(currentBoard, letter) {
        if (this.openingPatterns.length === 0) return null;
        
        let currentFilled = 0;
        for (const row of currentBoard) {
            for (const cell of row) {
                if (cell !== ' ') currentFilled++;
            }
        }
        
        if (currentFilled <= 5) {
            return this.getPatternBasedMove(currentBoard, letter);
        }
        
        return null;
    }

    getPatternBasedMove(currentBoard, letter) {
        const bestPositions = [];
        
        for (const pattern of this.openingPatterns.slice(0, 10)) {
            const similarityScore = this.calculateBoardSimilarity(currentBoard, pattern.grid);
            
            if (pattern.letterPositions[letter]) {
                for (const pos of pattern.letterPositions[letter]) {
                    const [r, c] = pos;
                    if (currentBoard[r][c] === ' ') {
                        const priority = this.calculatePositionPriority(currentBoard, r, c, pattern);
                        bestPositions.push([r, c, similarityScore + priority]);
                    }
                }
            }
        }
        
        if (bestPositions.length > 0) {
            bestPositions.sort((a, b) => b[2] - a[2]);
            return [bestPositions[0][0], bestPositions[0][1]];
        }
        
        const centerPositions = [];
        for (let r = 1; r < 4; r++) {
            for (let c = 1; c < 4; c++) {
                if (currentBoard[r][c] === ' ') {
                    centerPositions.push([r, c]);
                }
            }
        }
        
        return centerPositions.length > 0 ? randomChoice(centerPositions) : null;
    }

    calculateBoardSimilarity(currentBoard, patternGrid) {
        let similarity = 0;
        let totalPositions = 0;
        
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                totalPositions++;
                const currentCell = currentBoard[r][c];
                const patternCell = patternGrid[r][c];
                
                if (currentCell === patternCell) {
                    similarity++;
                } else if (currentCell === ' ' && patternCell !== ' ') {
                    similarity += 0.5;
                }
            }
        }
        
        return similarity / totalPositions;
    }

    calculatePositionPriority(currentBoard, row, col, pattern) {
        let priority = 0;
        
        const distanceFromCenter = Math.abs(row - 2) + Math.abs(col - 2);
        priority += (4 - distanceFromCenter) * 10;
        
        let adjacentCount = 0;
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (const [dr, dc] of directions) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5 && currentBoard[nr][nc] !== ' ') {
                adjacentCount++;
            }
        }
        priority += adjacentCount * 15;
        
        priority += pattern.score / 10;
        
        return priority;
    }
}

/**
 * AIPlayer - AI玩家基类
 */
class AIPlayer {
    choose_letter(game) {
        throw new Error('Not implemented');
    }

    place_letter(game) {
        throw new Error('Not implemented');
    }
}

/**
 * EasyAIPlayer - 简单难度AI
 */
class EasyAIPlayer extends AIPlayer {
    constructor(validWords) {
        super();
        this.validWords = validWords;
        this.letterPriority = {
            'E': 12, 'T': 11, 'A': 10, 'O': 9, 'I': 8, 'N': 7, 'S': 6, 'R': 5,
            'L': 4, 'D': 4, 'C': 3, 'M': 3, 'P': 3, 'H': 2, 'G': 2, 'B': 2,
            'F': 2, 'W': 2, 'Y': 2, 'K': 1, 'V': 1, 'X': 1, 'J': 1, 'Q': 1, 'Z': 1
        };
    }

    choose_letter(game) {
        const board = game.players_boards[1];

        const fillRate = this._getFillRate(board);
        const boardLetters = this._getBoardLetters(board);

        const completionLetters = this._findCompletionLetters(board, game.valid_words);

        const candidates = this._getCandidateLetters(boardLetters);
        const bestLetter = this._evaluateLetters(candidates, board, fillRate,
            completionLetters, game.valid_words);

        game.set_current_letter(bestLetter);
        game.add_game_record(1, bestLetter, null);
        console.log(`Easy AI 选择字母: ${bestLetter}`);
    }

    _getFillRate(board) {
        let filled = 0;
        for (const row of board) {
            for (const cell of row) {
                if (cell !== ' ') filled++;
            }
        }
        return filled / 25.0;
    }

    _getBoardLetters(board) {
        const letters = [];
        for (const row of board) {
            for (const cell of row) {
                if (cell !== ' ') letters.push(cell);
            }
        }
        const result = {};
        for (const letter of [...new Set(letters)]) {
            result[letter] = letters.filter(l => l === letter).length;
        }
        return result;
    }

    _findCompletionLetters(board, validWords) {
        const completionLetters = {};
        
        for (let i = 0; i < 5; i++) {
            const rowStr = board[i].join('');
            Object.assign(completionLetters, this._checkLineCompletion(rowStr, validWords));
            
            const colStr = board.map(row => row[i]).join('');
            Object.assign(completionLetters, this._checkLineCompletion(colStr, validWords));
        }
        
        return completionLetters;
    }

    _checkLineCompletion(lineStr, validWords) {
        const completionLetters = {};
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        
        for (let pos = 0; pos < 5; pos++) {
            if (lineStr[pos] === ' ') {
                for (const letter of alphabet) {
                    const testLine = lineStr.substring(0, pos) + letter + lineStr.substring(pos + 1);
                    
                    for (let start = 0; start < 5; start++) {
                        for (let end = start + 3; end <= 5; end++) {
                            if (start <= pos && pos < end) {
                                const subWord = testLine.substring(start, end).trim();
                                if (validWords.has(subWord)) {
                                    const score = subWord.length * 5;
                                    completionLetters[letter] = (completionLetters[letter] || 0) + score;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        return completionLetters;
    }

    _getCandidateLetters(boardLetters) {
        const candidates = [];
        for (const [letter, priority] of Object.entries(this.letterPriority)) {
            if ((boardLetters[letter] || 0) < 3) {
                candidates.push(letter);
            }
        }
        return candidates;
    }

    _evaluateLetters(candidates, board, fillRate, completionLetters, validWords) {
        let bestLetter = null;
        let bestScore = -1;
        
        for (const letter of candidates) {
            let score = 0;
            
            const baseScore = this.letterPriority[letter];
            if (fillRate < 0.4) {
                score += baseScore * 1.5;
            } else {
                score += baseScore * 0.8;
            }
            
            if (completionLetters[letter]) {
                score += completionLetters[letter] * 2.0;
            }
            
            const comboScore = this._calculateComboPotential(letter, board, validWords);
            score += comboScore;
            
            const placementScore = this._evaluatePlacementPotential(letter, board, validWords);
            score += placementScore;
            
            if (fillRate > 0.3) {
                const futureScore = this._evaluateFuturePotential(letter, board, validWords);
                score += futureScore * 0.5;
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestLetter = letter;
            }
        }
        
        return bestLetter || 'E';
    }

    _calculateComboPotential(letter, board, validWords) {
        const boardLetters = new Set();
        for (const row of board) {
            for (const cell of row) {
                if (cell !== ' ') boardLetters.add(cell);
            }
        }
        if (boardLetters.size === 0) return this.letterPriority[letter] * 0.1;
        
        const validWordsArray = Array.from(validWords);
        const sampleWords = this._sampleArray(validWordsArray, Math.min(300, validWordsArray.length));
        let comboScore = 0;
        
        for (const word of sampleWords) {
            if (word.includes(letter)) {
                const wordLetters = new Set(word.split(''));
                let commonCount = 0;
                for (const l of wordLetters) {
                    if (boardLetters.has(l)) commonCount++;
                }
                if (commonCount > 0) {
                    comboScore += commonCount * word.length * 0.02;
                }
            }
        }
        
        return Math.min(comboScore, 10);
    }

    _evaluatePlacementPotential(letter, board, validWords) {
        const emptyPositions = [];
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (board[r][c] === ' ') {
                    emptyPositions.push([r, c]);
                }
            }
        }
        if (emptyPositions.length === 0) return 0;
        
        let maxPlacementScore = 0;
        const checkPositions = emptyPositions.slice(0, 8);
        
        for (const [row, col] of checkPositions) {
            const tempBoard = deepCopy(board);
            tempBoard[row][col] = letter;
            const placementScore = this._quickPlacementScore(tempBoard, row, col, letter, validWords);
            maxPlacementScore = Math.max(maxPlacementScore, placementScore);
        }
        
        return maxPlacementScore * 0.3;
    }

    _quickPlacementScore(board, row, col, letter, validWords) {
        let score = 0;
        
        const rowWord = board[row].join('').trim();
        score += this._scoreLine(rowWord, validWords);
        
        const colWord = board.map(r => r[col]).join('').trim();
        score += this._scoreLine(colWord, validWords);
        
        return score;
    }

    _scoreLine(line, validWords) {
        let score = 0;
        for (const length of [5, 4, 3]) {
            for (let start = 0; start <= 5 - length; start++) {
                const subWord = line.substring(start, start + length).trim();
                if (validWords.has(subWord)) {
                    score += length * 5;
                }
            }
        }
        return score;
    }

    _evaluateFuturePotential(letter, board, validWords) {
        const tempBoard = deepCopy(board);
        let futureScore = 0;
        
        const emptyPositions = [];
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (board[r][c] === ' ') {
                    emptyPositions.push([r, c]);
                }
            }
        }
        if (emptyPositions.length === 0) return 0;
        
        const testPositions = this._sampleArray(emptyPositions, Math.min(3, emptyPositions.length));
        
        for (const [row, col] of testPositions) {
            tempBoard[row][col] = letter;
            const adjacentPotential = this._checkAdjacentPotential(tempBoard, row, col, validWords);
            futureScore += adjacentPotential;
            tempBoard[row][col] = ' ';
        }
        
        return testPositions.length > 0 ? futureScore / testPositions.length : 0;
    }

    _checkAdjacentPotential(board, row, col, validWords) {
        let potential = 0;
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        
        for (const [dr, dc] of directions) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5 && board[nr][nc] === ' ') {
                for (const testLetter of ['E', 'T', 'A', 'O', 'I']) {
                    board[nr][nc] = testLetter;
                    const score = this._quickPlacementScore(board, nr, nc, testLetter, validWords);
                    potential += score * 0.1;
                    board[nr][nc] = ' ';
                }
            }
        }
        
        return potential;
    }

    place_letter(game) {
        const emptyPositions = [];
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (game.players_boards[1][r][c] === ' ') {
                    emptyPositions.push([r, c]);
                }
            }
        }
        const currentLetter = game.get_current_letter().toUpperCase();

        if (emptyPositions.length === 0) {
            console.log('Easy AI 无空位可放置');
            return;
        }

        let bestPosition = null;
        let bestScore = -1;

        for (const [row, col] of emptyPositions) {
            const immediateScore = this._calculateImmediateScore(game.players_boards[1], row, col, currentLetter, game.valid_words);
            const strategicScore = this._calculateStrategicScore(game.players_boards[1], row, col);

            const totalScore = immediateScore * 1.5 + strategicScore * 0.5;

            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestPosition = [row, col];
            }
        }

        if (bestPosition) {
            const [row, col] = bestPosition;
            game.set_temp_placement(1, row, col, currentLetter);
            console.log(`Easy AI 放置字母 ${currentLetter} 在 行=${row}, 列=${col}`);
        } else {
            const [row, col] = randomChoice(emptyPositions);
            game.set_temp_placement(1, row, col, currentLetter);
            console.log(`Easy AI 随机放置字母 ${currentLetter} 在 行=${row}, 列=${col}`);
        }
    }

    _calculateImmediateScore(board, row, col, letter, validWords) {
        const tempBoard = deepCopy(board);
        tempBoard[row][col] = letter;
        
        let score = 0;
        const rowWord = tempBoard[row].join('').trim();
        score += this._scoreLine(rowWord, validWords);
        
        const colWord = tempBoard.map(r => r[col]).join('').trim();
        score += this._scoreLine(colWord, validWords);
        
        return score;
    }

    _calculateStrategicScore(board, row, col) {
        let score = 0;
        
        const centerDistance = Math.abs(row - 2) + Math.abs(col - 2);
        score += (4 - centerDistance) * 2;
        
        let adjacentCount = 0;
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (const [dr, dc] of directions) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5 && board[nr][nc] !== ' ') {
                adjacentCount++;
            }
        }
        score += adjacentCount * 3;
        
        return score;
    }
}

/**
 * MediumAIPlayer - 中等难度AI
 */
class MediumAIPlayer extends AIPlayer {
    constructor(validWords) {
        super();
        this.abPruning = new AlphaBetaPruning(validWords);
        this.validWords = validWords;
        this.evaluationCache = {};
        this.gamePhaseCache = {};
        
        this.boardRegions = {
            center: [[2, 2]],
            inner: [[1, 1], [1, 2], [1, 3], [2, 1], [2, 3], [3, 1], [3, 2], [3, 3]],
            outer: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 0], [1, 4],
                    [2, 0], [2, 4], [3, 0], [3, 4], [4, 0], [4, 1], [4, 2], [4, 3], [4, 4]]
        };
        
        this.letterWeights = {
            'E': 13, 'T': 12, 'A': 11, 'O': 10, 'I': 9, 'N': 8, 'S': 7, 'R': 6,
            'L': 5, 'D': 4, 'C': 3, 'M': 3, 'P': 3, 'H': 2, 'G': 2, 'B': 2,
            'F': 2, 'W': 2, 'Y': 2, 'K': 1, 'V': 1, 'X': 1, 'J': 1, 'Q': 1, 'Z': 1
        };
    }

    choose_letter(game) {
        const myBoard = game.players_boards[1];
        const opponentBoard = game.players_boards[0];

        const gameState = this._analyzeGameState(myBoard, opponentBoard);
        const bestLetter = this._searchOptimalLetter(myBoard, opponentBoard, gameState);

        game.set_current_letter(bestLetter);
        game.add_game_record(1, bestLetter, null);
        console.log(`Medium AI 选择字母: ${bestLetter} (阶段: ${gameState.phase})`);
    }

    _analyzeGameState(myBoard, opponentBoard) {
        const boardHash = generateBoardHash(myBoard, opponentBoard);
        if (this.gamePhaseCache[boardHash]) {
            return this.gamePhaseCache[boardHash];
        }
        
        const myFillRate = this._getFillRate(myBoard);
        const opponentFillRate = this._getFillRate(opponentBoard);
        
        const myScore = this._estimateBoardScore(myBoard);
        const opponentScore = this._estimateBoardScore(opponentBoard);
        const scoreDiff = myScore - opponentScore;
        
        const totalFillRate = (myFillRate + opponentFillRate) / 2;
        let phase;
        if (totalFillRate < 0.3) phase = 'opening';
        else if (totalFillRate < 0.7) phase = 'middle';
        else phase = 'endgame';
        
        const gameState = {
            phase,
            myFillRate,
            opponentFillRate,
            scoreDiff,
            urgency: Math.max(myFillRate, opponentFillRate) > 0.8
        };
        
        this.gamePhaseCache[boardHash] = gameState;
        return gameState;
    }

    _searchOptimalLetter(myBoard, opponentBoard, gameState) {
        const candidateLetters = this._getCandidateLetters(myBoard, gameState);
        
        let bestLetter = null;
        let bestValue = -Infinity;
        
        const filteredCandidates = this._heuristicFilter(candidateLetters, myBoard, gameState);
        
        for (const letter of filteredCandidates) {
            const value = this._evaluateLetterWithLookahead(letter, myBoard, opponentBoard, gameState);
            if (value > bestValue) {
                bestValue = value;
                bestLetter = letter;
            }
        }
        
        return bestLetter || 'E';
    }

    _getCandidateLetters(board, gameState) {
        const boardLetters = this._getBoardLetters(board);
        const candidates = [];
        
        for (const [letter, weight] of Object.entries(this.letterWeights)) {
            const usageLimit = gameState.phase === 'endgame' ? 4 : 3;
            if ((boardLetters[letter] || 0) < usageLimit) {
                candidates.push(letter);
            }
        }
        
        return candidates;
    }

    _heuristicFilter(candidates, board, gameState) {
        if (candidates.length <= 8) return candidates;
        
        const quickScores = [];
        for (const letter of candidates) {
            const score = this._quickLetterEvaluation(letter, board, gameState);
            quickScores.push([letter, score]);
        }
        
        quickScores.sort((a, b) => b[1] - a[1]);
        return quickScores.slice(0, 8).map(([letter]) => letter);
    }

    _quickLetterEvaluation(letter, board, gameState) {
        let score = this.letterWeights[letter];
        
        if (gameState.phase === 'opening') {
            score *= ['E', 'T', 'A', 'O', 'I'].includes(letter) ? 1.2 : 1.0;
        } else if (gameState.phase === 'endgame') {
            const completionScore = this._findCompletionOpportunities(board, letter);
            score += completionScore * 3;
        }
        
        return score;
    }

    _evaluateLetterWithLookahead(letter, myBoard, opponentBoard, gameState) {
        const cacheKey = `${letter}_${generateBoardHash(myBoard, opponentBoard)}`;
        if (this.evaluationCache[cacheKey]) {
            return this.evaluationCache[cacheKey];
        }
        
        const immediateValue = this._evaluateImmediateValue(letter, myBoard, gameState);
        const futurePotential = this._evaluateFuturePotential(letter, myBoard, gameState);
        const opponentRestriction = this._evaluateOpponentRestriction(letter, opponentBoard, gameState);
        const riskAssessment = this._evaluateRiskVariance(letter, myBoard, gameState);
        
        const weights = this._getDynamicWeights(gameState);
        
        const totalValue = immediateValue * weights.immediate +
            futurePotential * weights.future +
            opponentRestriction * weights.restriction -
            riskAssessment * weights.risk;
        
        this.evaluationCache[cacheKey] = totalValue;
        return totalValue;
    }

    _getDynamicWeights(gameState) {
        if (gameState.phase === 'opening') {
            return { immediate: 0.3, future: 0.5, restriction: 0.1, risk: 0.1 };
        } else if (gameState.phase === 'middle') {
            return { immediate: 0.4, future: 0.3, restriction: 0.2, risk: 0.1 };
        } else {
            return { immediate: 0.6, future: 0.1, restriction: 0.2, risk: 0.1 };
        }
    }

    _evaluateImmediateValue(letter, board, gameState) {
        let value = 0;
        
        for (const [region, positions] of Object.entries(this.boardRegions)) {
            const regionValue = this._evaluateRegionPotential(letter, board, positions);
            
            let regionMultiplier;
            if (gameState.phase === 'opening') {
                regionMultiplier = { center: 2.0, inner: 1.5, outer: 1.0 };
            } else {
                regionMultiplier = { center: 1.2, inner: 1.3, outer: 1.1 };
            }
            
            value += regionValue * regionMultiplier[region];
        }
        
        const completionValue = this._findCompletionOpportunities(board, letter);
        value += completionValue * 10;
        
        return value;
    }

    _evaluateRegionPotential(letter, board, positions) {
        let potential = 0;
        
        for (const [row, col] of positions) {
            if (board[row][col] === ' ') {
                const tempBoard = deepCopy(board);
                tempBoard[row][col] = letter;
                const positionValue = this._evaluatePositionValue(tempBoard, row, col, letter);
                potential += positionValue;
            }
        }
        
        return positions.length > 0 ? potential / positions.length : 0;
    }

    _evaluatePositionValue(board, row, col, letter) {
        let value = 0;
        
        const rowWord = board[row].join('').trim();
        const colWord = board.map(r => r[col]).join('').trim();
        
        value += this._scoreWordFormations(rowWord);
        value += this._scoreWordFormations(colWord);
        
        const connectivity = this._evaluateConnectivity(board, row, col);
        value += connectivity * 2;
        
        return value;
    }

    _evaluateFuturePotential(letter, board, gameState) {
        if (gameState.phase === 'endgame') return 0;
        
        const futureScenarios = this._simulateFutureScenarios(letter, board, 3);
        
        let expectedValue = 0;
        for (const scenario of futureScenarios) {
            expectedValue += scenario.value * scenario.probability;
        }
        
        return expectedValue;
    }

    _simulateFutureScenarios(letter, board, depth) {
        const scenarios = [];
        
        const emptyPositions = [];
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (board[r][c] === ' ') {
                    emptyPositions.push([r, c]);
                }
            }
        }
        
        const samplePositions = this._sampleArray(emptyPositions, Math.min(3, emptyPositions.length));
        
        for (const [row, col] of samplePositions) {
            const tempBoard = deepCopy(board);
            tempBoard[row][col] = letter;
            
            const futureValue = this._recursiveSimulation(tempBoard, depth - 1);
            
            scenarios.push({
                value: futureValue,
                probability: 1.0 / samplePositions.length
            });
        }
        
        return scenarios;
    }

    _recursiveSimulation(board, depth) {
        if (depth <= 0) {
            return this._estimateBoardScore(board);
        }
        
        const commonLetters = ['E', 'T', 'A', 'O', 'I'];
        let bestValue = 0;
        
        for (const letter of commonLetters) {
            const emptyPositions = [];
            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < 5; c++) {
                    if (board[r][c] === ' ') {
                        emptyPositions.push([r, c]);
                    }
                }
            }
            if (emptyPositions.length === 0) break;
            
            const bestPos = emptyPositions.reduce((best, pos) => {
                const score = this._quickPositionScore(board, pos[0], pos[1], letter);
                const bestScore = this._quickPositionScore(board, best[0], best[1], letter);
                return score > bestScore ? pos : best;
            });
            
            const tempBoard = deepCopy(board);
            tempBoard[bestPos[0]][bestPos[1]] = letter;
            
            const value = this._recursiveSimulation(tempBoard, depth - 1);
            bestValue = Math.max(bestValue, value);
        }
        
        return bestValue;
    }

    _evaluateOpponentRestriction(letter, opponentBoard, gameState) {
        if (gameState.phase === 'opening') return 0;
        
        const opponentOpportunities = this._findCompletionOpportunities(opponentBoard, letter);
        const restrictionValue = Math.max(0, 5 - opponentOpportunities);
        
        return restrictionValue;
    }

    _evaluateRiskVariance(letter, board, gameState) {
        const possibleOutcomes = [];
        const emptyPositions = [];
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (board[r][c] === ' ') {
                    emptyPositions.push([r, c]);
                }
            }
        }
        
        const samplePositions = this._sampleArray(emptyPositions, Math.min(5, emptyPositions.length));
        
        for (const [row, col] of samplePositions) {
            const tempBoard = deepCopy(board);
            tempBoard[row][col] = letter;
            const outcome = this._evaluatePositionValue(tempBoard, row, col, letter);
            possibleOutcomes.push(outcome);
        }
        
        if (possibleOutcomes.length > 1) {
            const variance = calculateVariance(possibleOutcomes);
            return variance * 0.1;
        }
        
        return 0;
    }

    _findCompletionOpportunities(board, letter) {
        let opportunities = 0;
        
        for (let i = 0; i < 5; i++) {
            const rowStr = board[i].join('');
            opportunities += this._countCompletionsInLine(rowStr, letter);
            
            const colStr = board.map(r => r[i]).join('');
            opportunities += this._countCompletionsInLine(colStr, letter);
        }
        
        return opportunities;
    }

    _countCompletionsInLine(lineStr, letter) {
        let count = 0;
        
        for (let pos = 0; pos < 5; pos++) {
            if (lineStr[pos] === ' ') {
                const testLine = lineStr.substring(0, pos) + letter + lineStr.substring(pos + 1);
                
                for (let start = 0; start < 5; start++) {
                    for (let end = start + 3; end <= 5; end++) {
                        if (start <= pos && pos < end) {
                            const subWord = testLine.substring(start, end).trim();
                            if (this.validWords.has(subWord)) {
                                count++;
                            }
                        }
                    }
                }
            }
        }
        
        return count;
    }

    place_letter(game) {
        const currentLetter = game.get_current_letter();
        const myBoard = game.players_boards[1];
        const opponentBoard = game.players_boards[0];

        const fillRate = this._getFillRate(myBoard);
        let depth;
        if (fillRate < 0.4) depth = 3;
        else if (fillRate < 0.7) depth = 4;
        else depth = 5;

        const originalDepth = this.abPruning.maxDepth;
        this.abPruning.maxDepth = depth;

        try {
            const [row, col] = this.abPruning.getBestMove(myBoard, opponentBoard, currentLetter);

            if (game.set_temp_placement(1, row, col, currentLetter)) {
                console.log(`Medium AI 放置字母 ${currentLetter} 在 行=${row}, 列=${col} (深度=${depth})`);
            } else {
                console.log(`Medium AI 放置失败: 行=${row}, 列=${col}`);
            }
        } finally {
            this.abPruning.maxDepth = originalDepth;
        }
    }

    _getFillRate(board) {
        let filled = 0;
        for (const row of board) {
            for (const cell of row) {
                if (cell !== ' ') filled++;
            }
        }
        return filled / 25.0;
    }

    _getBoardLetters(board) {
        const letters = [];
        for (const row of board) {
            for (const cell of row) {
                if (cell !== ' ') letters.push(cell);
            }
        }
        const result = {};
        for (const letter of [...new Set(letters)]) {
            result[letter] = letters.filter(l => l === letter).length;
        }
        return result;
    }

    _estimateBoardScore(board) {
        let score = 0;
        for (let i = 0; i < 5; i++) {
            const rowWord = board[i].join('').trim();
            score += this._scoreWordFormations(rowWord);
            
            const colWord = board.map(r => r[i]).join('').trim();
            score += this._scoreWordFormations(colWord);
        }
        return score;
    }

    _scoreWordFormations(line) {
        let score = 0;
        for (const length of [5, 4, 3]) {
            for (let start = 0; start <= 5 - length; start++) {
                const subWord = line.substring(start, start + length).trim();
                if (this.validWords.has(subWord)) {
                    score += length * length;
                }
            }
        }
        return score;
    }

    _evaluateConnectivity(board, row, col) {
        let connectivity = 0;
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (const [dr, dc] of directions) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5 && board[nr][nc] !== ' ') {
                connectivity++;
            }
        }
        return connectivity;
    }

    _quickPositionScore(board, row, col, letter) {
        const tempBoard = deepCopy(board);
        tempBoard[row][col] = letter;
        return this._evaluatePositionValue(tempBoard, row, col, letter);
    }
}

/**
 * HardAIPlayer - 困难难度AI
 */
class HardAIPlayer extends AIPlayer {
    constructor(validWords) {
        super();
        this.abPruning = new AlphaBetaPruning(validWords, 5, true);
        this.patternAnalyzer = new HighScorePatternAnalyzer();
        this.movesCount = 0;
    }

    choose_letter(game) {
        if (this.movesCount < 8 && this.patternAnalyzer.openingPatterns.length > 0) {
            const letter = this._getPatternRecommendedLetter(game.players_boards[1]);
            if (letter) {
                game.set_current_letter(letter);
                game.add_game_record(1, letter, null);
                console.log(`Hard AI 选择字母(基于高分模式): ${letter}`);
                return;
            }
        }

        const letter = this.abPruning.getBestLetter(game.players_boards[1], game.players_boards[0]);
        game.set_current_letter(letter);
        game.add_game_record(1, letter, null);
        console.log(`Hard AI 选择字母: ${letter}`);
    }

    place_letter(game) {
        const currentLetter = game.get_current_letter();

        if (this.movesCount < 8) {
            const patternMove = this.patternAnalyzer.findBestOpeningMove(
                game.players_boards[1], currentLetter
            );
            if (patternMove) {
                const [row, col] = patternMove;
                if (game.set_temp_placement(1, row, col, currentLetter)) {
                    this.movesCount++;
                    console.log(`Hard AI 放置字母(基于高分模式) ${currentLetter} 在 行=${row}, 列=${col}`);
                    return;
                }
            }
        }

        const [row, col] = this.abPruning.getBestMove(game.players_boards[1], game.players_boards[0], currentLetter);
        if (game.set_temp_placement(1, row, col, currentLetter)) {
            this.movesCount++;
            console.log(`Hard AI 放置字母 ${currentLetter} 在 行=${row}, 列=${col}`);
        } else {
            console.log(`Hard AI 放置失败: 行=${row}, 列=${col}`);
        }
    }

    _getPatternRecommendedLetter(currentBoard) {
        if (this.patternAnalyzer.openingPatterns.length === 0) return null;
        
        const letterScores = {};
        let currentFilled = 0;
        for (const row of currentBoard) {
            for (const cell of row) {
                if (cell !== ' ') currentFilled++;
            }
        }
        
        const boardLetters = new Set();
        for (const row of currentBoard) {
            for (const cell of row) {
                if (cell !== ' ') boardLetters.add(cell);
            }
        }
        
        for (const pattern of this.patternAnalyzer.openingPatterns.slice(0, 5)) {
            const patternLetters = [];
            let letterCount = 0;
            
            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < 5; c++) {
                    if (pattern.grid[r][c] !== ' ') {
                        letterCount++;
                        if (letterCount <= currentFilled + 3) {
                            patternLetters.push(pattern.grid[r][c]);
                        }
                    }
                }
            }
            
            for (const letter of patternLetters) {
                if (!boardLetters.has(letter)) {
                    letterScores[letter] = (letterScores[letter] || 0) + pattern.score / 100;
                }
            }
        }
        
        if (Object.keys(letterScores).length > 0) {
            let bestLetter = null;
            let bestScore = -Infinity;
            for (const [letter, score] of Object.entries(letterScores)) {
                if (score > bestScore) {
                    bestScore = score;
                    bestLetter = letter;
                }
            }
            return bestLetter;
        }
        
        return null;
    }
}

// 导出所有类
export {
    AlphaBetaPruning,
    MCTSNode,
    mctsSearch,
    HighScorePatternAnalyzer,
    AIPlayer,
    EasyAIPlayer,
    MediumAIPlayer,
    HardAIPlayer
};