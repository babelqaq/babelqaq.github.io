export class GameBoard {
    constructor(app, playerIndex, parent) {
        this.app = app;
        this.playerIndex = playerIndex;
        this.parent = parent;
        this.boardDiv = null;
        this.cells = [];
        this.rowScoreLabels = [];
        this.colScoreLabels = [];
        this.totalScoreLabel = null;
        this.confirmButton = null;
        this.boardContainer = null;
        this.init();
    }
    
    init() {
        this.boardContainer = document.createElement('div');
        this.boardContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 15px;
            background: ${this.app.COLORS.WHITE};
            border-radius: 15px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
        `;
        
        // 玩家标签
        const playerLabel = document.createElement('h3');
        playerLabel.textContent = this.playerIndex === 0 ? 'Player 1' : 
                                (this.app.mode === 'PVE' ? 'Computer' : 'Player 2');
        playerLabel.style.cssText = `
            font-family: 'Comic Sans MS', cursive;
            font-size: 20px;
            color: ${this.app.COLORS.PURPLE_BG};
            margin-bottom: 10px;
        `;
        this.boardContainer.appendChild(playerLabel);
        
        // 棋盘主体
        this.boardDiv = document.createElement('div');
        this.boardDiv.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 2px;
        `;
        
        // 创建5x5网格
        for (let row = 0; row < 5; row++) {
            const rowDiv = document.createElement('div');
            rowDiv.style.display = 'flex';
            rowDiv.style.gap = '2px';
            
            for (let col = 0; col < 5; col++) {
                const cell = document.createElement('div');
                cell.style.cssText = `
                    width: 50px;
                    height: 50px;
                    background: ${this.app.COLORS.BEIGE_BG};
                    border: 2px solid ${this.app.COLORS.PURPLE_BG};
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: 'Comic Sans MS', cursive;
                    font-size: 24px;
                    font-weight: bold;
                    color: ${this.app.COLORS.BROWN};
                    cursor: pointer;
                    transition: all 0.2s ease;
                `;
                
                cell.addEventListener('click', () => this.handleCellClick(row, col));
                this.cells.push({ row, col, element: cell });
                rowDiv.appendChild(cell);
            }
            this.boardDiv.appendChild(rowDiv);
        }
        
        // 行分数标签
        const rowScoresDiv = document.createElement('div');
        rowScoresDiv.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 2px;
            margin-left: 5px;
        `;
        for (let i = 0; i < 5; i++) {
            const label = document.createElement('span');
            label.style.cssText = `
                width: 25px;
                height: 50px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Comic Sans MS', cursive;
                font-size: 14px;
                color: ${this.app.COLORS.RED_BROWN};
            `;
            label.textContent = '0';
            this.rowScoreLabels.push(label);
            rowScoresDiv.appendChild(label);
        }
        
        const boardWithRowScores = document.createElement('div');
        boardWithRowScores.style.display = 'flex';
        boardWithRowScores.appendChild(this.boardDiv);
        boardWithRowScores.appendChild(rowScoresDiv);
        this.boardContainer.appendChild(boardWithRowScores);
        
        // 列分数标签
        const colScoresDiv = document.createElement('div');
        colScoresDiv.style.cssText = `
            display: flex;
            gap: 4px;
            margin-top: 5px;
            margin-left: 2px;
        `;
        for (let i = 0; i < 5; i++) {
            const label = document.createElement('span');
            label.style.cssText = `
                width: 50px;
                height: 25px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Comic Sans MS', cursive;
                font-size: 14px;
                color: ${this.app.COLORS.RED_BROWN};
            `;
            label.textContent = '0';
            this.colScoreLabels.push(label);
            colScoresDiv.appendChild(label);
        }
        this.boardContainer.appendChild(colScoresDiv);
        
        // 总分标签
        this.totalScoreLabel = document.createElement('div');
        this.totalScoreLabel.style.cssText = `
            margin-top: 10px;
            font-family: 'Comic Sans MS', cursive;
            font-size: 18px;
            color: ${this.app.COLORS.RED_BROWN};
        `;
        this.totalScoreLabel.textContent = 'Total: 0';
        this.boardContainer.appendChild(this.totalScoreLabel);

        // 确认放置按钮
        this.confirmButton = document.createElement('button');
        this.confirmButton.textContent = 'Confirm Placement';
        this.confirmButton.style.cssText = `
            padding: 10px 20px;
            margin-top: 10px;
            font-family: 'Comic Sans MS', cursive;
            font-size: 14px;
            background: ${this.app.COLORS.PURPLE_BG};
            color: ${this.app.COLORS.WHITE};
            border: none;
            border-radius: 8px;
            cursor: pointer;
            opacity: 0.5;
        `;
        this.confirmButton.addEventListener('click', () => this.handleConfirmPlacement());
        this.boardContainer.appendChild(this.confirmButton);

        this.parent.appendChild(this.boardContainer);
    }

    handleConfirmPlacement() {
        if (!this.app.game) return;

        const game = this.app.game;
        const tempPlacement = game.get_temp_placement(this.playerIndex);

        // 检查是否有临时放置
        if (!tempPlacement) {
            alert('No letter placed on the board.');
            return;
        }

        // 检查当前阶段是否允许确认
        const isValidPhase = (
            (game.phase === 'player_place' && this.playerIndex === game.current_player) ||
            (this.app.mode === 'PVE' && game.phase === 'player_place_ai_letter' && this.playerIndex === 0)
        );

        if (!isValidPhase) {
            return;
        }

        // 确认放置
        const result = game.confirm_placement(this.playerIndex);

        if (result === null || result === 'invalid') {
            alert('Invalid placement or game state issue.');
            return;
        }

        // 处理游戏流程
        this.handlePlacementResult(result);
    }

    handlePlacementResult(result) {
        const game = this.app.game;

        if (result === 'game_over') {
            this.app.stopGameLoop();
            setTimeout(() => this.app.showGameResult(), 500);
            return;
        }

        if (this.app.mode === 'PVE') {
            if (result === 'ai_place' || result === 'ai_choose_letter') {
                // AI选择并放置字母
                if (result === 'ai_choose_letter') {
                    game.ai_choose_letter();
                }
                this.app.currentLetter = game.get_current_letter();
                // AI放置延迟处理
                setTimeout(() => this.app.handleAITurn(), 500);
            } else if (result === 'player_place_ai_letter') {
                // 玩家需要放置AI选择的字母
                this.app.controls.letterInput.disabled = true;
                this.app.controls.confirmButton.disabled = true;
                this.app.currentLetter = game.get_current_letter();
                game.phase = 'player_place';
            } else if (result === 'player_choose') {
                // 回到玩家选择字母阶段
                this.app.controls.letterInput.disabled = false;
                this.app.controls.confirmButton.disabled = false;
                this.app.controls.letterInput.value = '';
                this.app.currentLetter = '';
            }
        } else {
            // PVP模式
            if (this.playerIndex === game.letter_owner) {
                // 当前放置者是字母输入者 -> 切换到对手放置
                game.current_player = 1 - game.letter_owner;
                game.phase = 'player_place';  // 改为 player_place
                // 不修改 letter_owner，保留字母归属
                // 不重置输入框，因为还没到输入阶段
            } else {
                // 当前放置者是对手 -> 回合结束，切换到新玩家输入字母
                game.current_player = 1 - game.letter_owner;
                game.phase = 'player_choose';
                game.letter_owner = game.current_player;
                this.app.controls.letterInput.disabled = false;
                this.app.controls.confirmButton.disabled = false;
                this.app.controls.letterInput.value = '';
                this.app.currentLetter = '';
            }
        }

        // 刷新UI
        this.app.updateUI();
    }
    
    handleCellClick(row, col) {
        if (!this.app.game) return;
        
        const game = this.app.game;
        const tempPlacement = game.get_temp_placement(this.playerIndex);
        
        // 如果是当前玩家的回合且有临时字母可放置
        if (game.current_player === this.playerIndex && 
            ['player_place', 'player_place_ai_letter'].includes(game.phase) &&
            game.get_current_letter()) {
            
            // 清除之前的临时放置
            if (tempPlacement) {
                const [prevRow, prevCol] = tempPlacement;
                const prevCell = this.cells.find(c => c.row === prevRow && c.col === prevCol);
                if (prevCell) {
                    prevCell.element.style.borderColor = this.app.COLORS.PURPLE_BG;
                }
            }
            
            // 设置新的临时放置
            if (game.set_temp_placement(this.playerIndex, row, col, game.get_current_letter())) {
                const cell = this.cells.find(c => c.row === row && c.col === col);
                if (cell) {
                    cell.element.textContent = game.get_current_letter();
                    // 临时放置：只着色字母（蓝色），格子不着色
                    cell.element.style.color = '#0000FF'; // PENDING_BLUE
                }
            }
        }
    }
    
    updateBoard() {
        if (!this.app.game) return;

        const game = this.app.game;
        const board = game.get_board_state(this.playerIndex);
        const highlights = game.get_highlight_positions(this.playerIndex);
        const tempPlacement = game.get_temp_placement(this.playerIndex);

        this.cells.forEach(cell => {
            const value = board[cell.row][cell.col];
            const isTemp = tempPlacement && tempPlacement[0] === cell.row && tempPlacement[1] === cell.col;

            // 设置文本内容：临时放置显示临时字母，否则显示棋盘内容
            if (isTemp) {
                cell.element.textContent = tempPlacement[2];
            } else {
                cell.element.textContent = value === ' ' ? '' : value;
            }

            // 设置颜色
            const isHighlighted = highlights.has(`${cell.row},${cell.col}`);

            if (isHighlighted) {
                cell.element.style.backgroundColor = this.app.COLORS.GREEN;
                cell.element.style.color = this.app.COLORS.BROWN;
            } else if (isTemp) {
                // 临时放置：只着色字母（蓝色），格子不着色
                cell.element.style.backgroundColor = this.app.COLORS.BEIGE_BG;
                cell.element.style.color = '#0000FF'; // PENDING_BLUE
            } else {
                cell.element.style.backgroundColor = this.app.COLORS.BEIGE_BG;
                cell.element.style.borderColor = this.app.COLORS.PURPLE_BG;
                cell.element.style.color = this.app.COLORS.BROWN;
            }
        });

        // 更新分数
        const [totalScore, rowScores, colScores] = game.calculate_player_score(this.playerIndex, true);
        rowScores.forEach((score, index) => {
            this.rowScoreLabels[index].textContent = score;
        });
        colScores.forEach((score, index) => {
            this.colScoreLabels[index].textContent = score;
        });
        this.totalScoreLabel.textContent = `Total: ${totalScore}`;

        // 更新确认按钮状态
        if (this.confirmButton) {
            const isActive = (
                (game.phase === 'player_place' && this.playerIndex === game.current_player) ||
                (this.app.mode === 'PVE' && game.phase === 'player_place_ai_letter' && this.playerIndex === 0)
            );
            this.confirmButton.style.opacity = isActive ? '1' : '0.5';
            this.confirmButton.disabled = !isActive;
        }
    }
}