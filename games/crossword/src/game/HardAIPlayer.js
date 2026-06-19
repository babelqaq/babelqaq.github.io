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

class HardAIPlayer extends AIPlayer {
    constructor(validWords) {
        super();
        // validWords comes as a Set from Game.js, convert to Array for operations like filter/includes
        const wordsArray = [...validWords];
        this.validWords = wordsArray;
        this.abPruning = new AlphaBetaPruning(validWords, 5, true);  // Pass original Set (uses .has())
        
        // 5字母单词字母频率统计
        this.letterFrequencyWeights = this._buildLetterFrequencyFor5LetterWords();
        
        // 常用字母列表
        this.commonLetters = Object.keys(this.letterFrequencyWeights).sort(
            (a, b) => this.letterFrequencyWeights[b] - this.letterFrequencyWeights[a]
        ).slice(0, 15);
        
        // 专家模板系统
        this.expertTemplates = this._loadExpertTemplates();
        this.currentTemplate = null;
        this.templatePositions = {};
        this.placedPositions = new Set();
        this.firstPlacement = true;
    }

    _buildLetterFrequencyFor5LetterWords() {
        /**统计所有5字母单词中字母出现频率*/
        const freq = {};
        for (const word of this.validWords) {
            if (word.length === 5) {
                const uniqueLetters = new Set(word.toUpperCase());
                for (const letter of uniqueLetters) {
                    freq[letter] = (freq[letter] || 0) + 1;
                }
            }
        }
        return freq;
    }

    _loadExpertTemplates() {
        /**加载专家模板文件*/
        try {
            const fs = require('fs');
            const path = require('path');
            const currentDir = path.dirname(__dirname);
            const templatePath = path.join(currentDir, 'data', 'top_skeletons.json');
            const data = fs.readFileSync(templatePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.log('Warning: top_skeletons.json not found. Template system disabled.');
            return [];
        }
    }

    _selectTemplateForLetter(letter) {
        /**Select a template that contains the given letter - randomly from suitable templates*/
        if (!this.expertTemplates.length) {
            return null;
        }
        
        const suitableTemplates = [];
        for (const template of this.expertTemplates) {
            try {
                if (typeof template !== 'object' || !template.words) {
                    continue;
                }
                
                const templateLetters = new Set();
                for (const wordInfo of template.words) {
                    if (typeof wordInfo === 'object' && wordInfo.word) {
                        const wordLetters = wordInfo.word.toUpperCase().split('');
                        wordLetters.forEach(l => templateLetters.add(l));
                    }
                }
                
                if (templateLetters.has(letter.toUpperCase())) {
                    suitableTemplates.push(template);
                }
            } catch (e) {
                console.log(`Warning: Error processing template: ${e}`);
                continue;
            }
        }
        
        if (suitableTemplates.length) {
            const selected = randomChoice(suitableTemplates);
            console.log(`Randomly selected template with frequency ${selected.frequency || 0} from ${suitableTemplates.length} suitable templates`);
            return selected;
        }
        return null;
    }

    _buildTemplatePositions(template) {
        /**Build position mapping for template - maps (row, col) to letter*/
        this.templatePositions = {};
        
        if (typeof template !== 'object' || !template.words) {
            console.log('Warning: Invalid template structure for position building');
            return;
        }
        
        for (const wordInfo of template.words) {
            try {
                if (typeof wordInfo !== 'object') {
                    console.log(`Warning: Invalid word_info: ${wordInfo}`);
                    continue;
                }
                
                const word = (wordInfo.word || '').toUpperCase();
                const direction = wordInfo.direction || '';
                const position = wordInfo.position || '';
                
                if (!word || !direction || !position) {
                    console.log(`Warning: Incomplete word_info: ${wordInfo}`);
                    continue;
                }
                
                if (direction === 'horizontal') {
                    try {
                        const row = parseInt(position.split('_')[1]);
                        for (let col = 0; col < word.length; col++) {
                            const key = `${row},${col}`;
                            this.templatePositions[key] = word[col];
                        }
                    } catch (e) {
                        console.log(`Warning: Invalid horizontal position format '${position}': ${e}`);
                        continue;
                    }
                } else if (direction === 'vertical') {
                    try {
                        const col = parseInt(position.split('_')[1]);
                        for (let row = 0; row < word.length; row++) {
                            const key = `${row},${col}`;
                            this.templatePositions[key] = word[row];
                        }
                    } catch (e) {
                        console.log(`Warning: Invalid vertical position format '${position}': ${e}`);
                        continue;
                    }
                }
            } catch (e) {
                console.log(`Warning: Error processing word_info: ${e}`);
                continue;
            }
        }
    }

    _isTemplatePosition(row, col) {
        /**Check if position is part of current template*/
        return `${row},${col}` in this.templatePositions;
    }

    _getNonTemplatePositions(board) {
        /**Get empty positions that are not part of the template*/
        const emptyPositions = [];
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (board[r][c] === ' ' && !this._isTemplatePosition(r, c)) {
                    emptyPositions.push([r, c]);
                }
            }
        }
        return emptyPositions;
    }

    _createTemplateFilledBoard(board) {
        /**Create a board with all template letters filled in for evaluation*/
        if (!this.currentTemplate) {
            return board;
        }
        
        const tempBoard = deepCopy(board);
        for (const [key, letter] of Object.entries(this.templatePositions)) {
            const [row, col] = key.split(',').map(Number);
            if (tempBoard[row][col] === ' ') {
                tempBoard[row][col] = letter;
            }
        }
        
        return tempBoard;
    }

    choose_letter(game) {
        /**Choose letter with template-aware strategy*/
        const myBoard = game.players_boards[1];
        
        // 计算实际游戏状态
        let totalEmpty = 0;
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (myBoard[r][c] === ' ') totalEmpty++;
            }
        }
        
        const templateReserved = Object.keys(this.templatePositions).length;
        
        // If we have a template and it's not complete, choose template letters first
        if (this.currentTemplate) {
            const neededLetters = this._getTemplateLettersActuallyNeeded(myBoard);
            if (neededLetters.length > 0) {
                const bestLetter = neededLetters[0];
                game.set_current_letter(bestLetter);
                game.add_game_record(1, bestLetter, null);
                console.log(`Hard AI 选择模板字母: ${bestLetter} (剩余模板字母: ${neededLetters}, 总空位: ${totalEmpty})`);
                return;
            }
        }
        
        // Fallback to original AI logic with template awareness
        let bestLetter;
        if (totalEmpty <= 8) {
            // 剩余空位很少，使用更精确的字母选择策略
            bestLetter = this._chooseLetterEndgameStrategy(myBoard);
        } else {
            bestLetter = this._chooseLetterBy5WordPotential(myBoard);
        }
        
        game.set_current_letter(bestLetter);
        game.add_game_record(1, bestLetter, null);
        console.log(`Hard AI 选择字母: ${bestLetter} (模板已完成或无可用模板, 总空位: ${totalEmpty})`);
    }

    _chooseLetterEndgameStrategy(board) {
        /**残局策略：剩余空位很少时的字母选择*/
        const emptyPositions = [];
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (board[r][c] === ' ') emptyPositions.push([r, c]);
            }
        }
        
        const letterScores = {};
        const nonTemplatePositions = this._getNonTemplatePositions(board);
        
        for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
            let totalScore = 0;
            
            for (const [r, c] of nonTemplatePositions) {
                const tempBoard = deepCopy(board);
                tempBoard[r][c] = letter;
                
                // 使用模板填充的棋盘进行评估
                const templateFilledBoard = this._createTemplateFilledBoard(tempBoard);
                
                // 计算直接完成单词的分数
                const completionScore = this._calculateWordCompletionBonus(templateFilledBoard, r, c, letter);
                const potentialScore = this._score5LetterPotential(templateFilledBoard);
                
                totalScore += completionScore + potentialScore;
            }
            
            letterScores[letter] = totalScore;
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
            console.log(`残局策略选择字母: ${bestLetter}, 得分: ${bestScore}`);
            return bestLetter;
        } else {
            return randomChoice('ETAOINSHRDLCUMWFGYPBVKJXQZ'.split(''));
        }
    }

    _getTemplateLettersActuallyNeeded(board) {
        /**Get template letters that still have available positions on the board*/
        if (!this.currentTemplate) {
            return [];
        }
        
        const availableTemplateLetters = [];
        
        for (const [key, letter] of Object.entries(this.templatePositions)) {
            const [row, col] = key.split(',').map(Number);
            // 检查这个位置是否已经被放置或超出边界
            if (row >= 0 && row < 5 && col >= 0 && col < 5 && 
                board[row][col] === ' ' && 
                !this.placedPositions.has(key)) {
                availableTemplateLetters.push(letter);
            }
        }
        
        // 去重但保持顺序
        const uniqueLetters = [...new Map(availableTemplateLetters.map(l => [l, l])).values()];
        // 按字母频率权重排序（权重越低=越稀有=优先级越高）
        const neededLetters = uniqueLetters.sort(
            (a, b) => (this.letterFrequencyWeights[a] || 27) - (this.letterFrequencyWeights[b] || 27)
        );
        
        console.log(`模板需要的字母: ${neededLetters}, 已放置位置: ${this.placedPositions.size}`);
        return neededLetters;
    }

    _chooseLetterBy5WordPotential(board) {
        /**选择最有潜力形成5字母单词的字母*/
        const emptyPositions = [];
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (board[r][c] === ' ') emptyPositions.push([r, c]);
            }
        }
        
        const letterScores = {};
        for (const letter of this.commonLetters) {
            let potentialScore = 0;
            for (const [r, c] of emptyPositions) {
                const tempBoard = deepCopy(board);
                tempBoard[r][c] = letter;
                potentialScore += this._score5LetterPotential(tempBoard);
            }
            letterScores[letter] = potentialScore;
        }
        
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

    // 在place_letter方法中添加后备机制
    place_letter(game) {
        /**Place letter with template-aware strategy*/
        const currentLetter = game.get_current_letter();
        const myBoard = game.players_boards[1];
        const opponentBoard = game.players_boards[0];
    
        // First placement: select template if available
        if (this.firstPlacement && this.expertTemplates.length > 0) {
            this.currentTemplate = this._selectTemplateForLetter(currentLetter);
            if (this.currentTemplate) {
                this._buildTemplatePositions(this.currentTemplate);
                console.log(`Using expert template with ${this.currentTemplate.words.length} words`);
            }
            this.firstPlacement = false;
        }
    
        // If current letter is in template and template position is available
        if (this.currentTemplate) {
            const availablePositions = [];
            for (const [key, templateLetter] of Object.entries(this.templatePositions)) {
                const [row, col] = key.split(',').map(Number);
                if (templateLetter === currentLetter && 
                    myBoard[row][col] === ' ' && 
                    !this.placedPositions.has(key)) {
                    availablePositions.push([row, col]);
                }
            }
            
            if (availablePositions.length > 0) {
                const [row, col] = availablePositions[0];
                const key = `${row},${col}`;
                this.placedPositions.add(key);
                if (game.set_temp_placement(1, row, col, currentLetter)) {
                    console.log(`Hard AI 放置模板字母 ${currentLetter} 在 行=${row}, 列=${col}`);
                    return;
                } else {
                    console.log('Hard AI 模板放置失败');
                }
            }
        }
    
        // Non-template placement: use AI logic with template consideration
        this.abPruning.maxDepth = 5;  // 降低搜索深度
        const [row, col] = this._bestPlacementWithTemplate(myBoard, opponentBoard, currentLetter);
        
        // 尝试放置，如果失败则使用随机位置
        if (game.set_temp_placement(1, row, col, currentLetter)) {
            console.log(`Hard AI 放置字母 ${currentLetter} 在 行=${row}, 列=${col}`);
        } else {
            console.log('Hard AI 放置失败，尝试随机位置');
            // 后备：随机选择一个空位
            const emptyPositions = [];
            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < 5; c++) {
                    if (myBoard[r][c] === ' ') emptyPositions.push([r, c]);
                }
            }
            if (emptyPositions.length > 0) {
                const [randRow, randCol] = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
                game.set_temp_placement(1, randRow, randCol, currentLetter);
                console.log(`Hard AI 随机放置字母 ${currentLetter} 在 行=${randRow}, 列=${randCol}`);
            }
        }
    }

    _bestPlacementWithTemplate(board, opponentBoard, letter) {
        /**Find best placement considering template*/
        // Get non-template positions only
        let nonTemplatePositions = this._getNonTemplatePositions(board);
        
        if (nonTemplatePositions.length === 0) {
            // Fallback to any empty position
            const emptyPositions = [];
            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < 5; c++) {
                    if (board[r][c] === ' ') emptyPositions.push([r, c]);
                }
            }
            if (emptyPositions.length === 0) {
                return [0, 0];
            }
            nonTemplatePositions = emptyPositions;
        }

        // 计算实际剩余空位数量（考虑模板占位）
        let totalEmpty = 0;
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (board[r][c] === ' ') totalEmpty++;
            }
        }
        
        const templateReserved = Object.keys(this.templatePositions).length;
        let actualAvailableSpaces = totalEmpty;
        if (this.currentTemplate) {
            let templateUsed = 0;
            for (const key of Object.keys(this.templatePositions)) {
                if (!this.placedPositions.has(key)) {
                    const [row, col] = key.split(',').map(Number);
                    if (board[row][col] === ' ') {
                        templateUsed++;
                    }
                }
            }
            actualAvailableSpaces = totalEmpty - templateUsed;
        }
        
        console.log(`模板感知搜索：总空位=${totalEmpty}, 模板保留=${templateReserved}, 实际可用=${actualAvailableSpaces}`);

        // 使用更深的搜索，因为实际决策空间较小
        if (actualAvailableSpaces <= 5) {
            // 非常少的空位，使用深度搜索和精确评估
            return this._precisePlacementSearch(board, opponentBoard, letter, nonTemplatePositions);
        } else if (actualAvailableSpaces <= 10) {
            // 中等空位，使用中等深度搜索
            return this._mediumPlacementSearch(board, opponentBoard, letter, nonTemplatePositions);
        } else {
            // 较多空位，使用快速搜索
            return this._quickPlacementSearch(board, opponentBoard, letter, nonTemplatePositions);
        }
    }

    // 在_precisePlacementSearch方法中添加边界检查
    _precisePlacementSearch(board, opponentBoard, letter, positions) {
        /**精确搜索：适用于剩余空位很少的情况*/
        const templateFilledBoard = this._createTemplateFilledBoard(board);
        
        // 检查是否有可用位置
        if (positions.length === 0) {
            const emptyPositions = [];
            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < 5; c++) {
                    if (board[r][c] === ' ') emptyPositions.push([r, c]);
                }
            }
            if (emptyPositions.length > 0) {
                return emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
            }
            return [0, 0];
        }
        
        let bestPos = positions[0];  // 使用第一个位置作为初始值
        let bestScore = -Infinity;
        
        for (const [r, c] of positions) {
            const tempBoard = deepCopy(templateFilledBoard);
            tempBoard[r][c] = letter;
            
            // 使用更深的minimax搜索
            const abScore = this.abPruning._minimax(tempBoard, opponentBoard, 4, -Infinity, Infinity, true);
            const lineScore = this._score5LetterPotential(tempBoard);
            
            // 增加直接完成单词的奖励
            const completionBonus = this._calculateWordCompletionBonus(tempBoard, r, c, letter);
            
            const finalScore = abScore * 1.5 + lineScore * 2.0 + completionBonus * 3.0;
            
            if (finalScore > bestScore) {
                bestScore = finalScore;
                bestPos = [r, c];
            }
        }
        
        console.log(`精确搜索选择位置: ${bestPos}`);
        return bestPos;
    }

    // 在_mediumPlacementSearch方法中添加边界检查
    _mediumPlacementSearch(board, opponentBoard, letter, positions) {
        /**中等搜索：适用于中等空位数量的情况*/
        const templateFilledBoard = this._createTemplateFilledBoard(board);
        
        // 检查是否有可用位置
        if (positions.length === 0) {
            const emptyPositions = [];
            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < 5; c++) {
                    if (board[r][c] === ' ') emptyPositions.push([r, c]);
                }
            }
            if (emptyPositions.length > 0) {
                return emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
            }
            return [0, 0];
        }
        
        let bestPos = positions[0];  // 使用第一个位置作为初始值
        let bestScore = -Infinity;
        
        for (const [r, c] of positions) {
            const tempBoard = deepCopy(templateFilledBoard);
            tempBoard[r][c] = letter;
            
            // 使用中等深度搜索
            const abScore = this.abPruning._minimax(tempBoard, opponentBoard, 3, -Infinity, Infinity, true);
            const lineScore = this._score5LetterPotential(tempBoard);
            const completionBonus = this._calculateWordCompletionBonus(tempBoard, r, c, letter);
            
            const finalScore = abScore + lineScore * 1.5 + completionBonus * 2.0;
            
            if (finalScore > bestScore) {
                bestScore = finalScore;
                bestPos = [r, c];
            }
        }
        
        console.log(`中等搜索选择位置: ${bestPos}`);
        return bestPos;
    }

    // 在_quickPlacementSearch方法中添加边界检查
    _quickPlacementSearch(board, opponentBoard, letter, positions) {
        /**快速搜索：适用于较多空位的情况*/
        const templateFilledBoard = this._createTemplateFilledBoard(board);
        
        // 检查是否有可用位置
        if (positions.length === 0) {
            const emptyPositions = [];
            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < 5; c++) {
                    if (board[r][c] === ' ') emptyPositions.push([r, c]);
                }
            }
            if (emptyPositions.length > 0) {
                return emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
            }
            return [0, 0];
        }
        
        let bestPos = positions[0];  // 使用第一个位置作为初始值
        let bestScore = -Infinity;
        
        for (const [r, c] of positions) {
            const tempBoard = deepCopy(templateFilledBoard);
            tempBoard[r][c] = letter;
            
            // 使用较浅搜索，但加入启发式评估
            const lineScore = this._score5LetterPotential(tempBoard);
            const abScore = this.abPruning._evaluateBoard(tempBoard, opponentBoard);
            const completionBonus = this._calculateWordCompletionBonus(tempBoard, r, c, letter);
            
            const finalScore = lineScore * 2.0 + abScore + completionBonus;
            
            if (finalScore > bestScore) {
                bestScore = finalScore;
                bestPos = [r, c];
            }
        }
        
        console.log(`快速搜索选择位置: ${bestPos}`);
        return bestPos;
    }

    _calculateWordCompletionBonus(board, row, col, letter) {
        /**计算放置该字母后能直接完成单词的奖励*/
        let bonus = 0;
        
        // 检查行方向
        const rowWord = board[row].join('');
        const rowWordNoSpace = rowWord.replace(/ /g, '');
        if (this.validWords.includes(rowWordNoSpace) && rowWordNoSpace.length >= 3) {
            bonus += 50 * rowWordNoSpace.length;
        }
        
        // 检查列方向
        const colWord = [];
        for (let r = 0; r < 5; r++) {
            colWord.push(board[r][col]);
        }
        const colWordNoSpace = colWord.join('').replace(/ /g, '');
        if (this.validWords.includes(colWordNoSpace) && colWordNoSpace.length >= 3) {
            bonus += 50 * colWordNoSpace.length;
        }
        
        return bonus;
    }

    _score5LetterPotential(board) {
        /**评估棋盘上当前可能形成的5字母词的潜力分数*/
        let score = 0;
        for (let i = 0; i < 5; i++) {
            const row = board[i].join('');
            const col = [];
            for (let r = 0; r < 5; r++) {
                col.push(board[r][i]);
            }
            score += this._scoreLineFor5Letter(row);
            score += this._scoreLineFor5Letter(col.join(''));
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
            return 0;
        }
        const possibleMatches = this._generatePossibleWordsFromPattern(line);
        return possibleMatches.length * (filled === 4 ? 10 : 3);
    }

    _generatePossibleWordsFromPattern(pattern) {
        /**从 pattern 如 'A B C  ' 中找到可能的完整5字母词*/
        pattern = pattern.toUpperCase();
        const regexStr = '^' + pattern.split('').map(ch => ch === ' ' ? '.' : ch).join('') + '$';
        const regex = new RegExp(regexStr);
        return this.validWords.filter(word => word.length === 5 && regex.test(word));
    }

}

export { HardAIPlayer };