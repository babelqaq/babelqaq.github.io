/**
 * 游戏工具函数模块
 */

export const GameUtils = {
    /**
     * 深拷贝对象
     * @param {Object} obj - 需要拷贝的对象
     * @returns {Object} 拷贝后的对象
     */
    deepCopy(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * 检查棋盘是否已满
     * @param {Array} board - 5x5棋盘数组
     * @returns {boolean} 是否已满
     */
    isBoardFull(board) {
        return board.every(row => row.every(cell => cell !== ' '));
    },

    /**
     * 获取棋盘上的空格位置
     * @param {Array} board - 5x5棋盘数组
     * @returns {Array} 空格位置数组 [[row, col], ...]
     */
    getEmptyPositions(board) {
        const positions = [];
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (board[r][c] === ' ') {
                    positions.push([r, c]);
                }
            }
        }
        return positions;
    },

    /**
     * 检查位置是否有效
     * @param {number} row - 行号
     * @param {number} col - 列号
     * @returns {boolean} 是否有效
     */
    isValidPosition(row, col) {
        return row >= 0 && row < 5 && col >= 0 && col < 5;
    },

    /**
     * 获取指定位置的相邻位置
     * @param {number} row - 行号
     * @param {number} col - 列号
     * @returns {Array} 相邻位置数组
     */
    getAdjacentPositions(row, col) {
        const positions = [];
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, -1], [-1, 1], [1, -1], [1, 1]
        ];
        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (this.isValidPosition(newRow, newCol)) {
                positions.push([newRow, newCol]);
            }
        }
        return positions;
    },

    /**
     * 计算棋盘上的空格数量
     * @param {Array} board - 5x5棋盘数组
     * @returns {number} 空格数量
     */
    countEmptySpaces(board) {
        let count = 0;
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (board[r][c] === ' ') {
                    count++;
                }
            }
        }
        return count;
    },

    /**
     * 生成随机字母
     * @returns {string} 随机大写字母
     */
    getRandomLetter() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return letters[Math.floor(Math.random() * letters.length)];
    },

    /**
     * 格式化时间戳
     * @param {Date} date - 日期对象
     * @returns {string} 格式化的时间字符串
     */
    formatTimestamp(date = new Date()) {
        return date.toISOString().replace('T', ' ').substring(0, 19);
    },

    /**
     * 保存游戏记录到 localStorage
     * @param {Array} records - 游戏记录数组
     */
    saveRecords(records) {
        try {
            localStorage.setItem('game_records', JSON.stringify(records, null, 2));
        } catch (error) {
            console.error('Failed to save game records:', error);
        }
    },

    /**
     * 从 localStorage 加载游戏记录
     * @returns {Array} 游戏记录数组
     */
    loadRecords() {
        try {
            const data = localStorage.getItem('game_records');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Failed to load game records:', error);
            return [];
        }
    },

    /**
     * 清空游戏记录
     */
    clearRecords() {
        try {
            localStorage.removeItem('game_records');
        } catch (error) {
            console.error('Failed to clear game records:', error);
        }
    },

    /**
     * 获取当前回合标签
     * @param {string} mode - 游戏模式 PVP/PVE
     * @param {number} currentPlayer - 当前玩家 0/1
     * @returns {string} 玩家标签
     */
    getPlayerLabel(mode, currentPlayer) {
        if (mode === 'PVE') {
            return currentPlayer === 0 ? 'Player 1' : 'Computer';
        }
        return `Player ${currentPlayer + 1}`;
    },

    /**
     * 获取阶段描述文本
     * @param {Object} game - 游戏对象
     * @returns {string} 阶段描述
     */
    getPhaseText(game) {
        const currentPlayer = this.getPlayerLabel(game.mode, game.current_player);
        
        switch (game.phase) {
            case 'player_choose':
                return `${currentPlayer}, please enter a letter`;
            case 'player_place':
            case 'player_place_ai_letter':
                return `${currentPlayer}, click a cell to place '${game.get_current_letter()}'`;
            case 'ai_choose':
            case 'ai_place1':
            case 'ai_place2':
                return 'Computer is thinking...';
            default:
                return `${currentPlayer}'s turn`;
        }
    }
};