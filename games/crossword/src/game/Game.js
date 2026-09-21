import { EasyAIPlayer } from './EasyAIPlayer.js';
import { MediumAIPlayer } from './MediumAIPlayer.js';
import { HardAIPlayer } from './HardAIPlayer.js';
import { GameUtils } from '../utils/gameUtils.js';
import { WordUtils } from '../utils/wordUtils.js';

/**
 * 游戏核心类
 * 负责管理棋盘状态、玩家回合、计分系统等
 */
export class Game {
    constructor(mode, difficulty = null) {
        this.mode = mode; // "PVP" 或 "PVE"
        this.difficulty = difficulty;
        // 初始化两个玩家的5x5棋盘
        this.players_boards = [
            Array(5).fill(null).map(() => Array(5).fill(' ')),
            Array(5).fill(null).map(() => Array(5).fill(' '))
        ];
        this.current_player = 0;
        this.remaining_spaces = 25;
        // 流程阶段：player_choose, player_place, ai_place1, ai_choose, ai_place2, player_place_ai_letter
        this.phase = "player_choose";
        this.current_letter = '';
        this.temp_placement = [null, null]; // 为两个玩家暂存放置位置
        this.letter_owner = 0; // 记录当前字母是由谁输入的（PVP模式使用）
        this.valid_words = new Set();
        this.records = [];
        this.record_file_path = 'game_records.json';
        this.ai_player = null;

        // 在浏览器中使用异步加载单词
        this.load_valid_words().then(() => {
            if (mode === "PVE") {
                this.ai_player = this.create_ai_player(difficulty);
            }
        });
    }

    create_ai_player(difficulty) {
        // 根据难度创建AI玩家
        switch (difficulty) {
            case "Easy":
                return new EasyAIPlayer(this.valid_words);
            case "Medium":
                return new MediumAIPlayer(this.valid_words);
            case "Hard":
                return new HardAIPlayer(this.valid_words);
            default:
                return null;
        }
    }

    set_current_letter(letter) {
        // 设置当前字母
        if (letter && letter.length === 1 && letter.match(/[a-zA-Z]/)) {
            this.current_letter = letter.toUpperCase();
            this.letter_owner = this.current_player; // 记录谁输入了这个字母
        } else {
            this.current_letter = 'A'; // 默认字母
        }
    }

    get_current_letter() {
        // 获取当前字母
        return this.current_letter;
    }

    set_temp_placement(player, row, col, letter) {
        // 设置临时放置位置
        if (row >= 0 && row < 5 && col >= 0 && col < 5 && 
            this.players_boards[player][row][col] === ' ') {
            this.temp_placement[player] = [row, col, letter];
            return true;
        }
        return false;
    }

    get_row_highlight_positions(player) {
        //获取行方向高亮位置
        const highlights = new Set();
        for (let row = 0; row < 5; row++) {
            const word = this.players_boards[player][row].join('');
            let longest_word = null;
            let max_length = 0;
            for (let start = 0; start < 5; start++) {
                for (let end = start + 3; end <= 5; end++) {
                    const sub_word = word.substring(start, end);
                    if (this.valid_words.has(sub_word) && sub_word.length > max_length) {
                        longest_word = [start, end];
                        max_length = sub_word.length;
                    }
                }
            }
            if (longest_word) {
                const [start, end] = longest_word;
                for (let col = start; col < end; col++) {
                    highlights.add(`${row},${col}`);
                }
            }
        }
        return highlights;
    }

    get_col_highlight_positions(player) {
        //获取列方向高亮位置
        const highlights = new Set();
        for (let col = 0; col < 5; col++) {
            const word = Array(5).fill(null).map((_, r) => this.players_boards[player][r][col]).join('');
            let longest_word = null;
            let max_length = 0;
            for (let start = 0; start < 5; start++) {
                for (let end = start + 3; end <= 5; end++) {
                    const sub_word = word.substring(start, end);
                    if (this.valid_words.has(sub_word) && sub_word.length > max_length) {
                        longest_word = [start, end];
                        max_length = sub_word.length;
                    }
                }
            }
            if (longest_word) {
                const [start, end] = longest_word;
                for (let row = start; row < end; row++) {
                    highlights.add(`${row},${col}`);
                }
            }
        }
        return highlights;
    }

    confirm_placement(player) {
        //确认放置字母
        if (this.temp_placement[player]) {
            const [row, col, letter] = this.temp_placement[player];
            this.players_boards[player][row][col] = letter;
            this.temp_placement[player] = null;
            this.add_game_record(player, letter, [row, col]);

            // 检查两个棋盘是否都已满
            if (this.is_board_full(0) && this.is_board_full(1)) {
                return "game_over";
            }

            if (this.mode === "PVE") {
                switch (this.phase) {
                    case "player_place":
                        this.phase = "ai_place1";
                        this.current_player = 1;
                        return "ai_place";
                    case "ai_place1":
                        this.phase = "ai_choose";
                        return "ai_choose_letter";
                    case "ai_place2":
                        this.phase = "player_place_ai_letter";
                        this.current_player = 0;
                        return "player_place_ai_letter";
                    case "player_place_ai_letter":
                        this.phase = "player_choose";
                        this.current_player = 0;
                        return "player_choose";
                }
            } else {
                // PVP模式，阶段由UI管理
                return "continue";
            }

            return "continue";
        }
        return null;
    }

    add_game_record(player, letter, position) {
        //添加游戏记录
        const player_label = this.mode === "PVP" 
            ? `Player ${player + 1}` 
            : (player === 0 ? "Player 1" : "Computer");

        const player_states = {};
        for (let p = 0; p < 2; p++) {
            const [total_score, row_scores, col_scores] = this.calculate_player_score(p, true);
            
            // 使用 "row" 和 "col" 作为 highlights key
            const highlights = {
                row: Array.from(this.get_row_highlight_positions(p)).map(pos => pos.split(',').map(Number)),
                col: Array.from(this.get_col_highlight_positions(p)).map(pos => pos.split(',').map(Number))
            };

            player_states[p] = {
                board: GameUtils.deepCopy(this.players_boards[p]),  // 修改这里
                row_scores: row_scores,
                col_scores: col_scores,
                total_score: total_score,
                highlights: highlights
            };
        }

        const record = {
            round: this.records.length + 1,
            player_type: player_label,
            input_letter: letter,
            position: position || [0, 0],
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            player_states: player_states
        };

        this.records.push(record);

        // 在浏览器中使用 localStorage 保存记录
        try {
            localStorage.setItem('game_records', JSON.stringify(this.records, null, 2));
        } catch (error) {
            console.error('Failed to save game records:', error);
        }
    }

    async load_valid_words() {
        this.valid_words = await WordUtils.loadValidWords();
    }

    calculate_player_score(player, return_breakdown = false) {
        return WordUtils.calculateBoardScore(this.players_boards[player], this.valid_words, return_breakdown);
    }

    get_highlight_paths(player) {
        //获取高亮路径 - 优先选择更长的单词
        const paths = [];
        // 移除 used_cells 的限制，允许同时高亮行和列方向的单词
        const all_words = [];
    
        // 收集所有行方向的有效单词
        for (let row = 0; row < 5; row++) {
            const word = this.players_boards[player][row].join('');
            for (let start = 0; start < 5; start++) {
                for (let end = start + 3; end <= 5; end++) {
                    const sub_word = word.substring(start, end);
                    if (this.valid_words.has(sub_word)) {
                        const word_path = [];
                        for (let col = start; col < end; col++) {
                            word_path.push([row, col]);
                        }
                        all_words.push({ length: sub_word.length, path: word_path });
                    }
                }
            }
        }
    
        // 收集所有列方向的有效单词
        for (let col = 0; col < 5; col++) {
            const word = Array(5).fill(null).map((_, r) => this.players_boards[player][r][col]).join('');
            for (let start = 0; start < 5; start++) {
                for (let end = start + 3; end <= 5; end++) {
                    const sub_word = word.substring(start, end);
                    if (this.valid_words.has(sub_word)) {
                        const word_path = [];
                        for (let row = start; row < end; row++) {
                            word_path.push([row, col]);
                        }
                        all_words.push({ length: sub_word.length, path: word_path });
                    }
                }
            }
        }
    
        // 按单词长度从长到短排序
        all_words.sort((a, b) => b.length - a.length);
    
        // 将所有有效单词路径添加到结果中，不再检查 used_cells
        for (const item of all_words) {
            paths.push(item.path);
        }
    
        return paths;
    }

    get_highlight_positions(player) {
        //从路径转换为所有高亮坐标点集合
        const positions = new Set();
        for (const path of this.get_highlight_paths(player)) {
            for (const pos of path) {
                positions.add(pos.join(','));
            }
        }
        return positions;
    }

    get_board_state(player) {
        //获取玩家的棋盘状态
        return this.players_boards[player];
    }

    get_temp_placement(player) {
        //获取玩家的临时放置位置
        return this.temp_placement[player];
    }

    is_ai_turn() {
    return this.mode === "PVE" &&
           this.current_player === 1 &&
           ['ai_place1', 'ai_choose', 'ai_place2'].includes(this.phase);
    }

    ai_choose_letter() {
        //AI选择字母
        if (this.ai_player) {
            this.ai_player.choose_letter(this);
            if (!this.current_letter) {
                this.current_letter = 'A'; // 默认字母
            }
            this.add_game_record(1, this.current_letter, null);
            this.phase = "ai_place2";
        }
    }

    ai_place_letter() {
        //AI放置字母
        if (this.ai_player) {
            const empty_positions = [];
            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < 5; c++) {
                    if (this.players_boards[1][r][c] === ' ') {
                        empty_positions.push([r, c]);
                    }
                }
            }
            if (empty_positions.length === 0) {
                return null;
            }
            this.ai_player.place_letter(this);
            return this.update_board_after_ai();
        }
        return null;
    }

    update_board_after_ai() {
        //在AI放置后更新棋盘并检查游戏状态
        if (this.temp_placement[1]) {
            const result = this.confirm_placement(1);
            return result;
        }
        return null;
    }

    is_board_full(player) {
        // 检查棋盘是否已满
        return this.players_boards[player].every(row => row.every(cell => cell !== ' '));
    }
}