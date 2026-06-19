/**
 * 单词工具函数模块
 */

export const WordUtils = {
    /**
     * 加载单词列表
     * @param {Array} fileNames - JSON文件名数组
     * @returns {Promise<Set>} 有效单词集合
     */
    async loadValidWords(fileNames = ["3-letter-words.json", "4-letter-words.json", "5-letter-words.json"]) {
        const validWords = new Set();
        
        for (const fileName of fileNames) {
            try {
                const response = await fetch(fileName);
                const data = await response.json();
                for (const item of data) {
                    validWords.add(item.word.toUpperCase());
                }
            } catch (error) {
                console.error(`Failed to load ${fileName}:`, error);
            }
        }
        
        // 添加一些默认单词以防加载失败
        if (validWords.size === 0) {
            this.addDefaultWords(validWords);
        }
        
        return validWords;
    },

    /**
     * 添加默认单词
     * @param {Set} wordSet - 单词集合
     */
    addDefaultWords(wordSet) {
        const defaultWords = [
            'CAT', 'DOG', 'SUN', 'RUN', 'HAT', 'BAT', 'RAT', 'MAT',
            'FOX', 'BOX', 'RED', 'BED', 'TED', 'WED', 'FUN', 'GUN',
            'CAR', 'BAR', 'MAR', 'JAR', 'WAR', 'STAR', 'CHAR', 'PART',
            'BEAR', 'DEAR', 'FEAR', 'HEAR', 'NEAR', 'PEAR', 'WEAR',
            'HELLO', 'WORLD', 'APPLE', 'TABLE', 'CHAIR', 'HOUSE', 'PHONE'
        ];
        defaultWords.forEach(word => wordSet.add(word));
    },

    /**
     * 检查单词是否有效
     * @param {string} word - 要检查的单词
     * @param {Set} validWords - 有效单词集合
     * @returns {boolean} 是否有效
     */
    isValidWord(word, validWords) {
        return validWords.has(word.toUpperCase());
    },

    /**
     * 获取行中的所有有效单词
     * @param {Array} row - 行数组
     * @param {Set} validWords - 有效单词集合
     * @returns {Array} 有效单词数组 [{word, start, end, length}, ...]
     */
    getValidWordsInRow(row, validWords) {
        const word = row.join('');
        const validWordsInfo = [];
        
        for (let length = 5; length >= 3; length--) {
            for (let start = 0; start <= 5 - length; start++) {
                const end = start + length;
                const subWord = word.substring(start, end);
                if (validWords.has(subWord)) {
                    validWordsInfo.push({
                        word: subWord,
                        start,
                        end,
                        length
                    });
                }
            }
        }
        
        return validWordsInfo;
    },

    /**
     * 获取列中的所有有效单词
     * @param {Array} board - 棋盘数组
     * @param {number} colIndex - 列索引
     * @param {Set} validWords - 有效单词集合
     * @returns {Array} 有效单词数组 [{word, start, end, length}, ...]
     */
    getValidWordsInColumn(board, colIndex, validWords) {
        const col = board.map(row => row[colIndex]);
        return this.getValidWordsInRow(col, validWords);
    },

    /**
     * 计算单词分数
     * @param {number} length - 单词长度
     * @returns {number} 分数
     */
    calculateWordScore(length) {
        const scores = { 3: 9, 4: 16, 5: 25 };
        return scores[length] || 0;
    },

    /**
     * 获取棋盘上的所有有效单词及其位置
     * @param {Array} board - 5x5棋盘数组
     * @param {Set} validWords - 有效单词集合
     * @returns {Array} 单词路径数组 [[[row, col], ...], ...]
     */
    getAllValidWordPaths(board, validWords) {
        const paths = [];
        const usedRowCells = Array(5).fill(null).map(() => new Set());
        const usedColCells = Array(5).fill(null).map(() => new Set());

        // 检查行
        for (let row = 0; row < 5; row++) {
            const word = board[row].join('');
            for (let start = 0; start < 5; start++) {
                for (let end = start + 3; end <= 5; end++) {
                    const subWord = word.substring(start, end);
                    if (validWords.has(subWord)) {
                        const wordPath = [];
                        for (let col = start; col < end; col++) {
                            wordPath.push([row, col]);
                        }
                        
                        let isUsed = false;
                        for (let col = start; col < end; col++) {
                            if (usedRowCells[row].has(col)) {
                                isUsed = true;
                                break;
                            }
                        }
                        
                        if (!isUsed) {
                            paths.push(wordPath);
                            for (let col = start; col < end; col++) {
                                usedRowCells[row].add(col);
                            }
                        }
                    }
                }
            }
        }

        // 检查列
        for (let col = 0; col < 5; col++) {
            const word = Array(5).fill(null).map((_, r) => board[r][col]).join('');
            for (let start = 0; start < 5; start++) {
                for (let end = start + 3; end <= 5; end++) {
                    const subWord = word.substring(start, end);
                    if (validWords.has(subWord)) {
                        const wordPath = [];
                        for (let row = start; row < end; row++) {
                            wordPath.push([row, col]);
                        }
                        
                        let isUsed = false;
                        for (let row = start; row < end; row++) {
                            if (usedColCells[col].has(row)) {
                                isUsed = true;
                                break;
                            }
                        }
                        
                        if (!isUsed) {
                            paths.push(wordPath);
                            for (let row = start; row < end; row++) {
                                usedColCells[col].add(row);
                            }
                        }
                    }
                }
            }
        }

        return paths;
    },

    /**
     * 获取高亮位置集合
     * @param {Array} board - 5x5棋盘数组
     * @param {Set} validWords - 有效单词集合
     * @returns {Set} 高亮位置集合 "row,col"
     */
    getHighlightPositions(board, validWords) {
        const positions = new Set();
        const paths = this.getAllValidWordPaths(board, validWords);
        for (const path of paths) {
            for (const pos of path) {
                positions.add(pos.join(','));
            }
        }
        return positions;
    },

    /**
     * 计算棋盘分数
     * @param {Array} board - 5x5棋盘数组
     * @param {Set} validWords - 有效单词集合
     * @param {boolean} returnBreakdown - 是否返回详细分数
     * @returns {number|Array} 总分或 [总分, 行分数数组, 列分数数组]
     */
    calculateBoardScore(board, validWords, returnBreakdown = false) {
        let score = 0;
        const usedRowIndices = Array(5).fill(null).map(() => new Set());
        const usedColIndices = Array(5).fill(null).map(() => new Set());
        const rowScores = Array(5).fill(0);
        const colScores = Array(5).fill(0);

        // 计算行分数
        for (let row = 0; row < 5; row++) {
            const word = board[row].join('');
            for (let length = 5; length >= 3; length--) {
                for (let start = 0; start <= 5 - length; start++) {
                    const end = start + length;
                    const subWord = word.substring(start, end);
                    if (validWords.has(subWord)) {
                        let isUsed = false;
                        for (let i = start; i < end; i++) {
                            if (usedRowIndices[row].has(i)) {
                                isUsed = true;
                                break;
                            }
                        }
                        if (!isUsed) {
                            const points = this.calculateWordScore(subWord.length);
                            score += points;
                            rowScores[row] += points;
                            for (let i = start; i < end; i++) {
                                usedRowIndices[row].add(i);
                            }
                        }
                    }
                }
            }
        }

        // 计算列分数
        for (let col = 0; col < 5; col++) {
            const word = Array(5).fill(null).map((_, r) => board[r][col]).join('');
            for (let length = 5; length >= 3; length--) {
                for (let start = 0; start <= 5 - length; start++) {
                    const end = start + length;
                    const subWord = word.substring(start, end);
                    if (validWords.has(subWord)) {
                        let isUsed = false;
                        for (let i = start; i < end; i++) {
                            if (usedColIndices[col].has(i)) {
                                isUsed = true;
                                break;
                            }
                        }
                        if (!isUsed) {
                            const points = this.calculateWordScore(subWord.length);
                            score += points;
                            colScores[col] += points;
                            for (let i = start; i < end; i++) {
                                usedColIndices[col].add(i);
                            }
                        }
                    }
                }
            }
        }

        if (returnBreakdown) {
            return [score, rowScores, colScores];
        }
        return score;
    },

    /**
     * 检查字母是否有效
     * @param {string} letter - 单个字母
     * @returns {boolean} 是否有效
     */
    isValidLetter(letter) {
        return letter && letter.length === 1 && letter.match(/[a-zA-Z]/);
    },

    /**
     * 字母转大写
     * @param {string} letter - 单个字母
     * @returns {string} 大写字母
     */
    toUpperCase(letter) {
        return letter ? letter.toUpperCase() : '';
    }
};