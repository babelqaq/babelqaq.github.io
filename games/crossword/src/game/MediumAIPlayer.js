import { AIPlayer } from './AIPlayer.js';
import { AlphaBetaPruning } from './AlphaBetaPruning.js';

/**
 * MediumAIPlayer - 中等难度AI，使用专家模板系�?
 */
export class MediumAIPlayer extends AIPlayer {
    constructor(validWords) {
        super();
        this.abPruning = new AlphaBetaPruning(validWords, 4);
        this.validWords = validWords;
        this.letterFreq5Words = this._buildLetterFrequencyFor5LetterWords();
        this.commonLetters = Object.keys(this.letterFreq5Words)
            .sort((a, b) => this.letterFreq5Words[b] - this.letterFreq5Words[a])
            .slice(0, 10);
        
        // 专家模板系统
        this.expertTemplates = this._loadExpertTemplates();
        this.currentTemplate = null;
        this.templatePositions = {};  // { 'row,col': letter }
        this.placedPositions = new Set();  // Track placed positions
        this.firstPlacement = true;
        
        // Letter frequency weights (lower = rarer = higher priority)
        this.letterFrequencyWeights = {
            'Q': 1, 'Z': 2, 'X': 3, 'J': 4, 'K': 5, 'V': 6, 'B': 7, 'P': 8, 'Y': 9, 'W': 10,
            'F': 11, 'M': 12, 'C': 13, 'U': 14, 'G': 15, 'H': 16, 'L': 17, 'D': 18, 'R': 19, 'S': 20,
            'N': 21, 'I': 22, 'O': 23, 'A': 24, 'T': 25, 'E': 26
        };
    }

    _buildLetterFrequencyFor5LetterWords() {
        //统计所有字母单词中字母出现频次
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
        /**Load cross-word templates from top_skeletons_cross.json*/
        try {
            const response = require('./top_skeletons_cross.json');
            const data = response.default || response;
            
            const templates = [];
            if (Array.isArray(data)) {
                templates.push(...data);
            } else if (typeof data === 'object') {
                if (data.templates) {
                    templates.push(...data.templates);
                } else if (data.skeletons) {
                    templates.push(...data.skeletons);
                } else {
                    templates.push(data);
                }
            }
            
            // Validate cross-word template structure
            const validTemplates = [];
            for (let i = 0; i < templates.length; i++) {
                const template = templates[i];
                if (typeof template === 'object' && template.words) {
                    const words = template.words;
                    if (words.length === 2) {
                        const directions = words.map(w => w.direction || '');
                        if (directions.includes('horizontal') && directions.includes('vertical')) {
                            validTemplates.push(template);
                        } else {
                            console.log(`Warning: Template ${i} is not a cross structure, skipping`);
                        }
                    } else {
                        console.log(`Warning: Template ${i} does not have exactly 2 words, skipping`);
                    }
                } else {
                    console.log(`Warning: Template ${i} has invalid structure, skipping`);
                }
            }
            
            console.log(`Loaded ${validTemplates.length} valid cross-word templates`);
            return validTemplates;
            
        } catch (e) {
            console.log('Warning: top_skeletons_cross.json not found. Cross-word template system disabled.');
            return [];
        }
    }

    _selectTemplateForLetter(letter) {
        /**Select a cross-word template that contains the given letter*/
        if (!this.expertTemplates.length) return null;
        
        const suitableTemplates = [];
        for (const template of this.expertTemplates) {
            try {
                if (typeof template !== 'object' || !template.words) continue;
                
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
            }
        }
        
        if (suitableTemplates.length) {
            const selected = suitableTemplates[Math.floor(Math.random() * suitableTemplates.length)];
            console.log(`Randomly selected cross-word template with frequency ${selected.frequency || 0} from ${suitableTemplates.length} suitable templates`);
            return selected;
        }
        return null;
    }

    _buildTemplatePositions(template) {
        /**Build position mapping for cross-word template - maps (row, col) to letter*/
        this.templatePositions = {};
        
        if (typeof template !== 'object' || !template.words) {
            console.log('Warning: Invalid template structure for position building');
            return;
        }
        
        for (const wordInfo of template.words) {
            try {
                if (typeof wordInfo !== 'object') {
                    console.log(`Warning: Invalid wordInfo: ${wordInfo}`);
                    continue;
                }
                
                const word = (wordInfo.word || '').toUpperCase();
                const direction = wordInfo.direction || '';
                const position = wordInfo.position || '';
                
                if (!word || !direction || !position) {
                    console.log(`Warning: Incomplete wordInfo: ${wordInfo}`);
                    continue;
                }
                
                if (direction === 'horizontal') {
                    try {
                        const row = parseInt(position.split('_')[1]);
                        for (let col = 0; col < word.length; col++) {
                            this.templatePositions[`${row},${col}`] = word[col];
                        }
                    } catch (e) {
                        console.log(`Warning: Invalid horizontal position format '${position}': ${e}`);
                    }
                } else if (direction === 'vertical') {
                    try {
                        const col = parseInt(position.split('_')[1]);
                        for (let row = 0; row < word.length; row++) {
                            this.templatePositions[`${row},${col}`] = word[row];
                        }
                    } catch (e) {
                        console.log(`Warning: Invalid vertical position format '${position}': ${e}`);
                    }
                }
            } catch (e) {
                console.log(`Warning: Error processing wordInfo: ${e}`);
            }
        }
    }

    _isTemplatePosition(row, col) {
        /**Check if position is part of current cross-word template*/
        return this.templatePositions[`${row},${col}`] !== undefined;
    }

    _getNonTemplatePositions(board) {
        /**Get empty positions that are not part of the cross-word template*/
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
        /**Create a board with all cross-word template letters filled in for evaluation*/
        if (!this.currentTemplate) return board;
        
        const tempBoard = JSON.parse(JSON.stringify(board));
        for (const key of Object.keys(this.templatePositions)) {
            const [row, col] = key.split(',').map(Number);
            if (tempBoard[row][col] === ' ') {
                tempBoard[row][col] = this.templatePositions[key];
            }
        }
        return tempBoard;
    }

    choose_letter(game) {
        /**Choose letter with template-aware strategy*/
        const myBoard = game.players_boards[1];
        
        // Calculate game state
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
            if (neededLetters.length) {
                const bestLetter = neededLetters[0];
                game.set_current_letter(bestLetter);
                game.add_game_record(1, bestLetter, null);
                console.log(`Medium AI 选择模板字母: ${bestLetter} (剩余模板字母: ${neededLetters}, 总空�? ${totalEmpty})`);
                return;
            }
        }
        
        // Fallback to original AI logic with template awareness
        let bestLetter;
        if (totalEmpty <= 8) {
            bestLetter = this._chooseLetterEndgameStrategy(myBoard);
        } else {
            bestLetter = this._chooseLetterBy5WordPotential(myBoard);
        }
        
        game.set_current_letter(bestLetter);
        game.add_game_record(1, bestLetter, null);
        console.log(`Medium AI 选择字母: ${bestLetter} (模板已完成或无可用模�? 总空�? ${totalEmpty})`);
    }

    _chooseLetterEndgameStrategy(board) {
        /**残局策略：剩余空位很少时的字母选择*/
        const nonTemplatePositions = this._getNonTemplatePositions(board);
        const letterScores = {};
        
        for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
            let totalScore = 0;
            
            for (const [r, c] of nonTemplatePositions) {
                const tempBoard = JSON.parse(JSON.stringify(board));
                tempBoard[r][c] = letter;
                
                const templateFilledBoard = this._createTemplateFilledBoard(tempBoard);
                
                const completionScore = this._calculateWordCompletionBonus(templateFilledBoard, r, c, letter);
                const potentialScore = this._score5LetterPotential(templateFilledBoard);
                
                totalScore += completionScore + potentialScore;
            }
            
            letterScores[letter] = totalScore;
        }
        
        if (Object.keys(letterScores).length) {
            let bestLetter = 'E';
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
            return 'ETAOINSHRDLCUMWFGYPBVKJXQZ'[Math.floor(Math.random() * 26)];
        }
    }

    _getTemplateLettersActuallyNeeded(board) {
        /**Get template letters that still have available positions on the board*/
        if (!this.currentTemplate) return [];
        
        const availableTemplateLetters = [];
        
        for (const key of Object.keys(this.templatePositions)) {
            const [row, col] = key.split(',').map(Number);
            const letter = this.templatePositions[key];
            
            if (row >= 0 && row < 5 && col >= 0 && col < 5 && 
                board[row][col] === ' ' && 
                !this.placedPositions.has(key)) {
                availableTemplateLetters.push(letter);
            }
        }
        
        // Remove duplicates while preserving order
        const uniqueLetters = [...new Map(availableTemplateLetters.map(l => [l, l])).values()];
        
        // Sort by frequency weight (lower = higher priority)
        const neededLetters = uniqueLetters.sort((a, b) => 
            (this.letterFrequencyWeights[a] || 27) - (this.letterFrequencyWeights[b] || 27)
        );
        
        console.log(`模板需要的字母: ${neededLetters}, 已放置位�? ${this.placedPositions.size}`);
        return neededLetters;
    }

    _chooseLetterBy5WordPotential(board) {
        //选择最有潜力形成字母单词的字母
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
                const tempBoard = JSON.parse(JSON.stringify(board));
                tempBoard[r][c] = letter;
                potentialScore += this._score5LetterPotential(tempBoard);
            }
            letterScores[letter] = potentialScore;
        }
        
        let bestLetter = 'E';
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
        /**Place letter with template-aware strategy*/
        const currentLetter = game.get_current_letter();
        const myBoard = game.players_boards[1];
        const opponentBoard = game.players_boards[0];

        // First placement: select template if available
        if (this.firstPlacement && this.expertTemplates.length) {
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
            for (const key of Object.keys(this.templatePositions)) {
                const [row, col] = key.split(',').map(Number);
                const templateLetter = this.templatePositions[key];
                
                if (templateLetter === currentLetter && 
                    myBoard[row][col] === ' ' && 
                    !this.placedPositions.has(key)) {
                    availablePositions.push([row, col]);
                }
            }
            
            if (availablePositions.length) {
                const [row, col] = availablePositions[0];
                this.placedPositions.add(`${row},${col}`);
                if (game.set_temp_placement(1, row, col, currentLetter)) {
                    console.log(`Medium AI 放置模板字母 ${currentLetter} 行${row}, 列${col}`);
                    return;
                } else {
                    console.log('Medium AI 模板放置失败');
                }
            }
        }

        // Non-template placement: use AI logic with template consideration
        this.abPruning.maxDepth = 6;
        const [row, col] = this._bestPlacementWithTemplate(myBoard, opponentBoard, currentLetter);
        if (game.set_temp_placement(1, row, col, currentLetter)) {
            console.log(`Medium AI 放置字母 ${currentLetter} 行${row}, 列${col}`);
            return;
        } else {
            console.log('Medium AI 最佳位置放置失败，尝试随机放置');
        }

        // 后备方案：随机选择一个空位置放置
        const emptyPositions = [];
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (myBoard[r][c] === ' ') {
                    emptyPositions.push([r, c]);
                }
            }
        }
        
        if (emptyPositions.length > 0) {
            const [randRow, randCol] = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
            if (game.set_temp_placement(1, randRow, randCol, currentLetter)) {
                console.log(`Medium AI 随机放置字母 ${currentLetter} 行${randRow}, 列${randCol}`);
            } else {
                console.error('Medium AI 所有放置尝试均失败！');
            }
        } else {
            console.error('Medium AI 没有可用位置！');
        }
    }

    _bestPlacementWithTemplate(board, opponentBoard, letter) {
        /**Find best placement considering template*/
        let nonTemplatePositions = this._getNonTemplatePositions(board);
        
        if (!nonTemplatePositions.length) {
            // Fallback to any empty position
            const emptyPositions = [];
            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < 5; c++) {
                    if (board[r][c] === ' ') {
                        emptyPositions.push([r, c]);
                    }
                }
            }
            if (!emptyPositions.length) return [0, 0];
            nonTemplatePositions = emptyPositions;
        }

        // Calculate actual available spaces
        let totalEmpty = 0;
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (board[r][c] === ' ') totalEmpty++;
            }
        }
        
        let templateReserved = 0;
        if (this.currentTemplate) {
            templateReserved = Object.keys(this.templatePositions).length;
            for (const key of Object.keys(this.templatePositions)) {
                const [row, col] = key.split(',').map(Number);
                if (this.placedPositions.has(key) || board[row][col] !== ' ') {
                    templateReserved--;
                }
            }
        }
        const actualAvailableSpaces = totalEmpty - templateReserved;
        
        console.log(`模板感知搜索：总空�?${totalEmpty}, 模板保留=${templateReserved}, 实际可用=${actualAvailableSpaces}`);

        // Use appropriate search depth based on available spaces
        if (actualAvailableSpaces <= 5) {
            return this._precisePlacementSearch(board, opponentBoard, letter, nonTemplatePositions);
        } else if (actualAvailableSpaces <= 10) {
            return this._mediumPlacementSearch(board, opponentBoard, letter, nonTemplatePositions);
        } else {
            return this._quickPlacementSearch(board, opponentBoard, letter, nonTemplatePositions);
        }
    }

    _precisePlacementSearch(board, opponentBoard, letter, positions) {
        /**精确搜索：适用于剩余空位很少的情况*/
        const templateFilledBoard = this._createTemplateFilledBoard(board);
        
        let bestPos = [0, 0];
        let bestScore = -Infinity;
        
        for (const [r, c] of positions) {
            const tempBoard = JSON.parse(JSON.stringify(templateFilledBoard));
            tempBoard[r][c] = letter;
            
            const abScore = this.abPruning._minimax(tempBoard, opponentBoard, 4, -Infinity, Infinity, true);
            const lineScore = this._score5LetterPotential(tempBoard);
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

    _mediumPlacementSearch(board, opponentBoard, letter, positions) {
        /**中等搜索：适用于中等空位数量的情况*/
        const templateFilledBoard = this._createTemplateFilledBoard(board);
        
        let bestPos = [0, 0];
        let bestScore = -Infinity;
        
        for (const [r, c] of positions) {
            const tempBoard = JSON.parse(JSON.stringify(templateFilledBoard));
            tempBoard[r][c] = letter;
            
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

    _quickPlacementSearch(board, opponentBoard, letter, positions) {
        /**快速搜索：适用于较多空位的情况*/
        const templateFilledBoard = this._createTemplateFilledBoard(board);
        
        let bestPos = [0, 0];
        let bestScore = -Infinity;
        
        for (const [r, c] of positions) {
            const tempBoard = JSON.parse(JSON.stringify(templateFilledBoard));
            tempBoard[r][c] = letter;
            
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
        
        // Check row
        const rowWord = board[row].join('').replace(/ /g, '');
        if (this.validWords.has(rowWord) && rowWord.length >= 3) {
            bonus += 50 * rowWord.length;
        }
        
        // Check column
        const colWord = board.map(r => r[col]).join('').replace(/ /g, '');
        if (this.validWords.has(colWord) && colWord.length >= 3) {
            bonus += 50 * colWord.length;
        }
        
        return bonus;
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
        if (line.length !== 5) return 0;
        const filled = line.split('').filter(ch => ch !== ' ').length;
        if (filled < 3) return 0;
        const possibleMatches = this._generatePossibleWordsFromPattern(line);
        return possibleMatches.length * (filled === 4 ? 10 : 3);
    }

    _generatePossibleWordsFromPattern(pattern) {
        /**根据模式（如 "A B C  "）找到可能的完整5字母单词*/
        pattern = pattern.toUpperCase();
        const regexStr = '^' + pattern.split('').map(ch => ch === ' ' ? '.' : ch).join('') + '$';
        const regex = new RegExp(regexStr);
        const matches = [];
        for (const word of this.validWords) {
            if (word.length === 5 && regex.test(word.toUpperCase())) {
                matches.push(word);
            }
        }
        return matches;
    }
}
