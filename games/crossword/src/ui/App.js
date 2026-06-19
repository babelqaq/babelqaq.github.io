import { Game } from '../game/Game.js';
import { GameBoard } from './GameBoard.js';
import { GameControls } from './GameControls.js';
import { ScorePanel } from './ScorePanel.js';

export class App {
    constructor(container) {
        this.container = container;
        this.game = null;
        this.mode = null;
        this.difficulty = null;
        this.hideMode = true;
        this.currentLetter = '';
        this.controls = null;
        this.player1Board = null;
        this.player2Board = null;
        this.scorePanel = null;
        this.aiCover = null;
        
        this.COLORS = {
            BEIGE_BG: '#F5F5DC',
            PURPLE_BG: '#9B59B6',
            RED_BROWN: '#8B0000',
            WHITE: '#FFFFFF',
            BROWN: '#3E2723',
            GREEN: '#2ECC71',
            BLUE: '#3498DB',
            ORANGE: '#E67E22'
        };
        
        this.initScale();
        this.init();
    }
    
    initScale() {
        const updateScale = () => {
            const baseWidth = 1200;
            const baseHeight = 800;

            const scaleX = window.innerWidth / baseWidth;
            const scaleY = window.innerHeight / baseHeight;
            const scale = Math.min(scaleX, scaleY);

            this.container.style.transform = `scale(${scale})`;
            this.container.style.transformOrigin = 'center center';
        };

        window.addEventListener('resize', updateScale);
        window.addEventListener('load', updateScale);
        
        // 初始执行一次
        updateScale();
    }
    
    init() {
        this.container.innerHTML = '';
        this.createStartScreen();
    }
    
    createStartScreen() {
        document.body.className = 'menu';
        this.container.innerHTML = '';
        const startDiv = document.createElement('div');
        startDiv.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
        `;
        
        const title = document.createElement('h1');
        title.textContent = '5x5 Crossword Game';
        title.style.cssText = `
            font-family: 'Comic Sans MS', cursive;
            font-size: 48px;
            color: ${this.COLORS.RED_BROWN};
            margin-bottom: 50px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        `;
        startDiv.appendChild(title);
        
        const buttonStyle = `
            width: 250px;
            height: 60px;
            margin: 15px;
            font-family: 'Comic Sans MS', cursive;
            font-size: 20px;
            background: ${this.COLORS.PURPLE_BG};
            color: ${this.COLORS.WHITE};
            border: none;
            border-radius: 15px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        `;
        
        const pvpBtn = document.createElement('button');
        pvpBtn.textContent = 'Play with Friend';
        pvpBtn.style.cssText = buttonStyle;
        pvpBtn.addEventListener('click', () => this.setMode('PVP'));
        startDiv.appendChild(pvpBtn);
        
        const pveBtn = document.createElement('button');
        pveBtn.textContent = 'Play with Computer';
        pveBtn.style.cssText = buttonStyle;
        pveBtn.addEventListener('click', () => this.chooseDifficulty());
        startDiv.appendChild(pveBtn);
        
        const tutorialBtn = document.createElement('button');
        tutorialBtn.textContent = 'Game Guide';
        tutorialBtn.style.cssText = buttonStyle;
        tutorialBtn.addEventListener('click', () => this.showTutorial());
        startDiv.appendChild(tutorialBtn);
        
        this.container.appendChild(startDiv);
    }
    
    chooseDifficulty() {
        document.body.className = 'menu';
        this.container.innerHTML = '';
        
        const difficultyDiv = document.createElement('div');
        difficultyDiv.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
        `;
        
        const title = document.createElement('h2');
        title.textContent = 'Select Difficulty';
        title.style.cssText = `
            font-family: 'Comic Sans MS', cursive;
            font-size: 36px;
            color: ${this.COLORS.RED_BROWN};
            margin-bottom: 40px;
        `;
        difficultyDiv.appendChild(title);
        
        const buttonStyle = `
            width: 200px;
            height: 50px;
            margin: 10px;
            font-family: 'Comic Sans MS', cursive;
            font-size: 18px;
            color: ${this.COLORS.WHITE};
            border: none;
            border-radius: 15px;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        
        const easyBtn = document.createElement('button');
        easyBtn.textContent = 'Easy';
        easyBtn.style.cssText = buttonStyle + `background: ${this.COLORS.GREEN};`;
        easyBtn.addEventListener('click', () => this.setMode('PVE', 'Easy'));
        difficultyDiv.appendChild(easyBtn);
        
        const mediumBtn = document.createElement('button');
        mediumBtn.textContent = 'Medium';
        mediumBtn.style.cssText = buttonStyle + `background: ${this.COLORS.ORANGE};`;
        mediumBtn.addEventListener('click', () => this.setMode('PVE', 'Medium'));
        difficultyDiv.appendChild(mediumBtn);
        
        const hardBtn = document.createElement('button');
        hardBtn.textContent = 'Hard';
        hardBtn.style.cssText = buttonStyle + `background: ${this.COLORS.RED_BROWN};`;
        hardBtn.addEventListener('click', () => this.setMode('PVE', 'Hard'));
        difficultyDiv.appendChild(hardBtn);
        
        const backBtn = document.createElement('button');
        backBtn.textContent = 'Back';
        backBtn.style.cssText = buttonStyle + `background: ${this.COLORS.PURPLE_BG}; width: 150px;`;
        backBtn.addEventListener('click', () => this.createStartScreen());
        difficultyDiv.appendChild(backBtn);
        
        this.container.appendChild(difficultyDiv);
    }
    
    setMode(mode, difficulty = null) {
        this.mode = mode;
        this.difficulty = difficulty;
        this.game = new Game(mode, difficulty);
        this.initGame();
    }
    
    initGame() {
        document.body.className = 'game';
        // 重新创建游戏对象，重置游戏状态
        this.game = new Game(this.mode, this.difficulty);
        
        this.container.innerHTML = '';
        
        const gameDiv = document.createElement('div');
        gameDiv.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
            min-height: 100vh;
            max-width: 1200px;
            margin: 0 auto;
            width: 100%;
        `;
        
        // 游戏标题
        const title = document.createElement('h1');
        title.textContent = '5x5 Crossword Game';
        title.style.cssText = `
            font-family: 'Comic Sans MS', cursive;
            font-size: 32px;
            color: ${this.COLORS.RED_BROWN};
            margin-bottom: 20px;
        `;
        gameDiv.appendChild(title);
        
        // 游戏控制区
        this.controls = new GameControls(this, gameDiv);
        
        // 玩家棋盘区域
        const boardsContainer = document.createElement('div');
        boardsContainer.style.cssText = `
            display: flex;
            gap: 40px;
            margin: 20px 0;
            position: relative;
        `;
        
        this.player1Board = new GameBoard(this, 0, boardsContainer);
        this.player2Board = new GameBoard(this, 1, boardsContainer);
        
        gameDiv.appendChild(boardsContainer);
        
        // 分数面板
        this.scorePanel = new ScorePanel(this, gameDiv);
        
        // AI遮罩（PVE模式）
        if (this.mode === 'PVE') {
            this.createAICover();
        }
        
        this.container.appendChild(gameDiv);
        
        // 开始监听游戏事件
        this.startGameLoop();
    }
    
    createAICover() {
        // 移除旧的遮罩
        if (this.aiCover) {
            this.aiCover.remove();
        }

        // 获取电脑棋盘的完整容器（boardContainer）
        const computerBoardContainer = this.player2Board?.boardContainer;
        if (!computerBoardContainer) return;

        // 确保电脑棋盘容器有相对定位
        computerBoardContainer.style.position = 'relative';

        this.aiCover = document.createElement('div');
        this.aiCover.id = 'ai-cover';
        this.aiCover.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(155, 89, 182, 1.0);
            border-radius: 15px;
            z-index: 100;
            display: ${this.hideMode ? 'flex' : 'none'};
            flex-direction: column;
            align-items: center;
            justify-content: center;
        `;

        const catImage = document.createElement('img');
        catImage.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="40" r="30" fill="%23FFB347"/%3E%3Ccircle cx="35" cy="30" r="12" fill="white"/%3E%3Ccircle cx="65" cy="30" r="12" fill="white"/%3E%3Ccircle cx="38" cy="30" r="6" fill="black"/%3E%3Ccircle cx="68" cy="30" r="6" fill="black"/%3E%3Cellipse cx="50" cy="45" rx="8" ry="5" fill="pink"/%3E%3Cline x1="25" y1="25" x2="10" y2="15" stroke="%23FFB347" stroke-width="3"/%3E%3Cline x1="75" y1="25" x2="90" y2="15" stroke="%23FFB347" stroke-width="3"/%3E%3C/svg%3E';
        catImage.style.width = '100px';
        catImage.style.height = '100px';
        this.aiCover.appendChild(catImage);

        const label = document.createElement('span');
        label.textContent = 'Computer\'s Board';
        label.style.cssText = `
            font-family: 'Comic Sans MS', cursive;
            font-size: 18px;
            color: ${this.COLORS.WHITE};
            margin-top: 15px;
        `;
        this.aiCover.appendChild(label);

        computerBoardContainer.appendChild(this.aiCover);
    }
    
    toggleHideMode() {
        this.hideMode = !this.hideMode;
        if (this.aiCover) {
            this.aiCover.style.display = this.hideMode ? 'flex' : 'none';
        }
    }
    
    showTutorial() {
        document.body.className = 'menu';
        this.container.innerHTML = '';
        
        const tutorialDiv = document.createElement('div');
        tutorialDiv.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
            min-height: 100vh;
        `;
        
        const title = document.createElement('h2');
        title.textContent = 'Game Guide';
        title.style.cssText = `
            font-family: 'Comic Sans MS', cursive;
            font-size: 28px;
            color: ${this.COLORS.RED_BROWN};
            margin-bottom: 20px;
        `;
        tutorialDiv.appendChild(title);
        
        const content = document.createElement('div');
        content.style.cssText = `
            max-width: 600px;
            padding: 20px;
            background: ${this.COLORS.WHITE};
            border-radius: 15px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
        `;
        
        const instructions = [
            '1. Players take turns entering letters (A-Z).',
            '2. Each letter must be placed on an empty cell on both players\' boards.',
            '3. Words can be formed horizontally or vertically.',
            '4. Score points for words of 3 or more letters:',
            '   - 3-letter words: 9 points',
            '   - 4-letter words: 16 points',
            '   - 5-letter words: 25 points',
            '5. The game ends when both boards are full.',
            '6. The player with the highest score wins!' 
        ];
        
        instructions.forEach((text, index) => {
            const p = document.createElement('p');
            p.textContent = text;
            p.style.cssText = `
                font-family: 'Comic Sans MS', cursive;
                font-size: 16px;
                color: ${this.COLORS.BROWN};
                margin: 8px 0;
                line-height: 1.5;
            `;
            content.appendChild(p);
        });
        
        tutorialDiv.appendChild(content);
        
        const backBtn = document.createElement('button');
        backBtn.textContent = 'Back';
        backBtn.style.cssText = `
            padding: 12px 30px;
            margin-top: 20px;
            font-family: 'Comic Sans MS', cursive;
            font-size: 18px;
            background: ${this.COLORS.PURPLE_BG};
            color: ${this.COLORS.WHITE};
            border: none;
            border-radius: 10px;
            cursor: pointer;
        `;
        backBtn.addEventListener('click', () => this.createStartScreen());
        tutorialDiv.appendChild(backBtn);
        
        this.container.appendChild(tutorialDiv);
    }
    
    showMenu() {
        const menuWindow = document.createElement('div');
        menuWindow.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${this.COLORS.WHITE};
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: 200;
        `;
        
        const title = document.createElement('h3');
        title.textContent = 'Menu';
        title.style.cssText = `
            font-family: 'Comic Sans MS', cursive;
            font-size: 22px;
            color: ${this.COLORS.PURPLE_BG};
            margin-bottom: 20px;
            text-align: center;
        `;
        menuWindow.appendChild(title);
        
        const buttonStyle = `
            display: block;
            width: 150px;
            padding: 10px;
            margin: 10px auto;
            font-family: 'Comic Sans MS', cursive;
            font-size: 16px;
            background: ${this.COLORS.PURPLE_BG};
            color: ${this.COLORS.WHITE};
            border: none;
            border-radius: 8px;
            cursor: pointer;
        `;
        
        const newGameBtn = document.createElement('button');
        newGameBtn.textContent = 'New Game';
        newGameBtn.style.cssText = buttonStyle;
        newGameBtn.addEventListener('click', () => {
            this.stopGameLoop();
            menuWindow.remove();
            overlay.remove();
            this.initGame();
        });
        menuWindow.appendChild(newGameBtn);
        
        // PVE模式下显示隐藏模式选项
        if (this.mode === 'PVE') {
            const hideBtn = document.createElement('button');
            hideBtn.textContent = this.hideMode ? 'Show AI Board' : 'Hide AI Board';
            hideBtn.style.cssText = buttonStyle + `background: ${this.COLORS.ORANGE};`;
            hideBtn.addEventListener('click', () => {
                this.toggleHideMode();
                hideBtn.textContent = this.hideMode ? 'Show AI Board' : 'Hide AI Board';
            });
            menuWindow.appendChild(hideBtn);
        }
        
        // 返回主菜单按钮
        const mainMenuBtn = document.createElement('button');
        mainMenuBtn.textContent = 'Main Menu';
        mainMenuBtn.style.cssText = buttonStyle + `background: ${this.COLORS.RED_BROWN};`;
        mainMenuBtn.addEventListener('click', () => {
            this.stopGameLoop(); 
            menuWindow.remove();
            overlay.remove();
        
            this.game = null;
            this.controls = null;
            this.player1Board = null;
            this.player2Board = null;
            this.scorePanel = null;
            this.aiCover = null;
        
            this.createStartScreen();
        });
        menuWindow.appendChild(mainMenuBtn);
        
        // 背景遮罩
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.5);
            z-index: 199;
        `;
        overlay.addEventListener('click', () => {
            menuWindow.remove();
            overlay.remove();
        });
        
        document.body.appendChild(overlay);
        document.body.appendChild(menuWindow);
    }
    
    showHistory() {
        const records = this.game ? this.game.records : [];
        const placedRecords = records.filter(record => record.position && record.position[0] !== 0);
        
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.5);
            z-index: 199;
        `;
        document.body.appendChild(overlay);
        
        const historyWindow = document.createElement('div');
        historyWindow.style.cssText = `
            position: fixed;
            top: 5%;
            left: 5%;
            right: 5%;
            bottom: 5%;
            background: ${this.COLORS.WHITE};
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: 200;
            display: flex;
            flex-direction: column;
            align-items: center;
            overflow: hidden;
        `;
        
        // 创建缩放容器
        const scaleContainer = document.createElement('div');
        scaleContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            transition: transform 0.3s ease;
        `;
        historyWindow.appendChild(scaleContainer);
        
        const title = document.createElement('h3');
        title.textContent = 'Game History';
        title.style.cssText = `
            font-family: 'Comic Sans MS', cursive;
            font-size: 24px;
            color: ${this.COLORS.PURPLE_BG};
            margin-bottom: 20px;
        `;
        scaleContainer.appendChild(title);
        
        const recordLabel = document.createElement('div');
        recordLabel.style.cssText = `
            font-family: 'Comic Sans MS', cursive;
            font-size: 14px;
            color: ${this.COLORS.BROWN};
            margin-bottom: 15px;
            text-align: center;
            min-height: 60px;
            padding: 10px;
            background: ${this.COLORS.BEIGE_BG};
            border-radius: 8px;
            width: 100%;
        `;
        scaleContainer.appendChild(recordLabel);
        
        const historyBoards = {
            boards: [[], []],
            rowScores: [[], []],
            colScores: [[], []],
            totalScores: [null, null]
        };
        
        const boardsContainer = document.createElement('div');
        boardsContainer.style.display = 'flex';
        boardsContainer.style.gap = '30px';
        
        for (let player = 0; player < 2; player++) {
            const playerContainer = document.createElement('div');
            playerContainer.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 15px;
                background: ${this.COLORS.BEIGE_BG};
                border-radius: 12px;
            `;
            
            const playerLabel = document.createElement('h4');
            playerLabel.textContent = player === 0 ? 'Player 1' : (this.mode === 'PVE' ? 'Computer' : 'Player 2');
            playerLabel.style.cssText = `
                font-family: 'Comic Sans MS', cursive;
                font-size: 18px;
                color: ${this.COLORS.PURPLE_BG};
                margin-bottom: 10px;
            `;
            playerContainer.appendChild(playerLabel);
            
            const boardDiv = document.createElement('div');
            boardDiv.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 2px;
            `;
            
            for (let row = 0; row < 5; row++) {
                const rowDiv = document.createElement('div');
                rowDiv.style.display = 'flex';
                rowDiv.style.gap = '2px';
                
                for (let col = 0; col < 5; col++) {
                    const cell = document.createElement('div');
                    cell.style.cssText = `
                        width: 45px;
                        height: 45px;
                        background: ${this.COLORS.WHITE};
                        border: 2px solid ${this.COLORS.PURPLE_BG};
                        border-radius: 6px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-family: 'Comic Sans MS', cursive;
                        font-size: 22px;
                        font-weight: bold;
                        color: ${this.COLORS.BROWN};
                    `;
                    historyBoards.boards[player].push({ row, col, element: cell });
                    rowDiv.appendChild(cell);
                }
                boardDiv.appendChild(rowDiv);
            }
            
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
                    width: 22px;
                    height: 45px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: 'Comic Sans MS', cursive;
                    font-size: 12px;
                    color: ${this.COLORS.RED_BROWN};
                `;
                label.textContent = '0';
                historyBoards.rowScores[player].push(label);
                rowScoresDiv.appendChild(label);
            }
            
            const boardWithRowScores = document.createElement('div');
            boardWithRowScores.style.display = 'flex';
            boardWithRowScores.appendChild(boardDiv);
            boardWithRowScores.appendChild(rowScoresDiv);
            playerContainer.appendChild(boardWithRowScores);
            
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
                    width: 45px;
                    height: 22px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: 'Comic Sans MS', cursive;
                    font-size: 12px;
                    color: ${this.COLORS.RED_BROWN};
                `;
                label.textContent = '0';
                historyBoards.colScores[player].push(label);
                colScoresDiv.appendChild(label);
            }
            playerContainer.appendChild(colScoresDiv);
            
            const totalScoreLabel = document.createElement('div');
            totalScoreLabel.style.cssText = `
                margin-top: 10px;
                font-family: 'Comic Sans MS', cursive;
                font-size: 16px;
                color: ${this.COLORS.RED_BROWN};
            `;
            totalScoreLabel.textContent = 'Total: 0';
            historyBoards.totalScores[player] = totalScoreLabel;
            playerContainer.appendChild(totalScoreLabel);
            boardsContainer.appendChild(playerContainer);
        }
        
        scaleContainer.appendChild(boardsContainer);
        
        const navFrame = document.createElement('div');
        navFrame.style.cssText = `
            display: flex;
            gap: 20px;
            margin-top: 20px;
        `;
        
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '← Previous';
        prevBtn.style.cssText = `
            padding: 10px 25px;
            font-family: 'Comic Sans MS', cursive;
            font-size: 16px;
            background: ${this.COLORS.PURPLE_BG};
            color: ${this.COLORS.WHITE};
            border: none;
            border-radius: 8px;
            cursor: pointer;
        `;
        navFrame.appendChild(prevBtn);
        
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next →';
        nextBtn.style.cssText = `
            padding: 10px 25px;
            font-family: 'Comic Sans MS', cursive;
            font-size: 16px;
            background: ${this.COLORS.PURPLE_BG};
            color: ${this.COLORS.WHITE};
            border: none;
            border-radius: 8px;
            cursor: pointer;
        `;
        navFrame.appendChild(nextBtn);
        
        scaleContainer.appendChild(navFrame);
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = `
            padding: 10px 30px;
            margin-top: 15px;
            font-family: 'Comic Sans MS', cursive;
            font-size: 16px;
            background: ${this.COLORS.RED_BROWN};
            color: ${this.COLORS.WHITE};
            border: none;
            border-radius: 8px;
            cursor: pointer;
        `;
        closeBtn.addEventListener('click', () => {
            window.removeEventListener('resize', updateScale);
            historyWindow.remove();
            overlay.remove();
        });
        scaleContainer.appendChild(closeBtn);
        
        document.body.appendChild(historyWindow);
        
        // 计算缩放比例
        const updateScale = () => {
            const containerWidth = historyWindow.offsetWidth;
            const containerHeight = historyWindow.offsetHeight;
            
            // 计算内容的自然尺寸
            const contentWidth = 560; // 两个棋盘的宽度 + 间距
            const contentHeight = 340; // 标题 + 记录标签 + 棋盘 + 按钮
            
            const scaleX = (containerWidth - 50) / contentWidth;
            const scaleY = (containerHeight - 50) / contentHeight;
            const scale = Math.min(scaleX, scaleY, 1);
            
            scaleContainer.style.transform = `scale(${scale})`;
            scaleContainer.style.transformOrigin = 'top center';
        };
        
        window.addEventListener('resize', updateScale);
        updateScale();
        
        let currentRecordIndex = placedRecords.length - 1;
        
        const updateRecordDisplay = () => {
            if (!placedRecords.length) {
                recordLabel.textContent = 'No history records available';
                for (let player = 0; player < 2; player++) {
                    historyBoards.boards[player].forEach(cell => {
                        cell.element.textContent = '';
                        cell.element.style.backgroundColor = this.COLORS.WHITE;
                        cell.element.style.color = this.COLORS.BROWN;
                    });
                    historyBoards.rowScores[player].forEach(label => label.textContent = '0');
                    historyBoards.colScores[player].forEach(label => label.textContent = '0');
                    historyBoards.totalScores[player].textContent = `Total: 0`;
                }
                return;
            }
            
            const record = placedRecords[currentRecordIndex];
            const position = record.position;
            
            let displayText = `Round: ${record.round}\nPlayer: ${record.player_type}\nLetter: ${record.input_letter}`;
            if (position && position[0] !== 0) {
                displayText += `\nPosition: Row ${position[0]+1} Col ${position[1]+1}`;
            } else {
                displayText += `\nAction: Input Letter`;
            }
            displayText += `\nTime: ${record.timestamp}`;
            recordLabel.textContent = displayText;
            
            for (let player = 0; player < 2; player++) {
                const state = record.player_states[player];
                const board = state.board;
                const highlights = state.highlights;
                
                const highlightSet = new Set();
                if (highlights.row) {
                    highlights.row.forEach(pos => highlightSet.add(`${pos[0]},${pos[1]}`));
                }
                if (highlights.col) {
                    highlights.col.forEach(pos => highlightSet.add(`${pos[0]},${pos[1]}`));
                }
                
                historyBoards.boards[player].forEach(cell => {
                    const value = board[cell.row][cell.col];
                    cell.element.textContent = value === ' ' ? '' : value;
                    
                    const isHighlighted = highlightSet.has(`${cell.row},${cell.col}`);
                    if (isHighlighted) {
                        cell.element.style.backgroundColor = this.COLORS.GREEN;
                        cell.element.style.color = this.COLORS.BROWN;
                    } else {
                        cell.element.style.backgroundColor = this.COLORS.WHITE;
                        cell.element.style.color = this.COLORS.BROWN;
                    }
                });
                
                state.row_scores.forEach((score, index) => {
                    historyBoards.rowScores[player][index].textContent = score;
                });
                state.col_scores.forEach((score, index) => {
                    historyBoards.colScores[player][index].textContent = score;
                });
                historyBoards.totalScores[player].textContent = `Total: ${state.total_score}`;
            }
            
            prevBtn.disabled = currentRecordIndex === 0;
            prevBtn.style.opacity = currentRecordIndex === 0 ? 0.5 : 1;
            nextBtn.disabled = currentRecordIndex === placedRecords.length - 1;
            nextBtn.style.opacity = currentRecordIndex === placedRecords.length - 1 ? 0.5 : 1;
        };
        
        prevBtn.addEventListener('click', () => {
            if (currentRecordIndex > 0) {
                currentRecordIndex--;
                updateRecordDisplay();
            }
        });
        
        nextBtn.addEventListener('click', () => {
            if (currentRecordIndex < placedRecords.length - 1) {
                currentRecordIndex++;
                updateRecordDisplay();
            }
        });
        
        updateRecordDisplay();
    }
    
    showGameResult() {
        const player1Score = this.game.calculate_player_score(0);
        const player2Score = this.game.calculate_player_score(1);
        
        let result = '';
        let color = '';
        
        if (player1Score > player2Score) {
            result = this.mode === 'PVE' ? 'You Win!' : 'Player 1 Wins!';
            color = this.COLORS.GREEN;
        } else if (player2Score > player1Score) {
            result = this.mode === 'PVE' ? 'Computer Wins!' : 'Player 2 Wins!';
            color = this.COLORS.RED_BROWN;
        } else {
            result = 'It\'s a Tie!';
            color = this.COLORS.BLUE;
        }
        
        const resultWindow = document.createElement('div');
        resultWindow.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${this.COLORS.WHITE};
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: 200;
            text-align: center;
        `;
        
        const title = document.createElement('h2');
        title.textContent = result;
        title.style.cssText = `
            font-family: 'Comic Sans MS', cursive;
            font-size: 36px;
            color: ${color};
            margin-bottom: 20px;
        `;
        resultWindow.appendChild(title);
        
        const scoreDiv = document.createElement('div');
        scoreDiv.style.cssText = `
            font-family: 'Comic Sans MS', cursive;
            font-size: 24px;
            color: ${this.COLORS.BROWN};
            margin-bottom: 30px;
        `;
        scoreDiv.innerHTML = `Player 1: <strong>${player1Score}</strong> vs ${this.mode === 'PVE' ? 'Computer' : 'Player 2'}: <strong>${player2Score}</strong>`;
        resultWindow.appendChild(scoreDiv);
        
        const buttonStyle = `
            padding: 12px 30px;
            margin: 10px;
            font-family: 'Comic Sans MS', cursive;
            font-size: 18px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
        `;
        
        const newGameBtn = document.createElement('button');
        newGameBtn.textContent = 'New Game';
        newGameBtn.style.cssText = buttonStyle + `background: ${this.COLORS.GREEN}; color: ${this.COLORS.WHITE};`;
        newGameBtn.addEventListener('click', () => {  // Changed from exitBtn to newGameBtn
            this.stopGameLoop();

            resultWindow.remove();
            overlay.remove();

            this.game = null;
            this.controls = null;
            this.player1Board = null;
            this.player2Board = null;
            this.scorePanel = null;
            this.aiCover = null;

            this.createStartScreen();
        });
        resultWindow.appendChild(newGameBtn);

        const exitBtn = document.createElement('button');
        exitBtn.textContent = 'Exit to Menu';
        exitBtn.style.cssText = buttonStyle + `background: ${this.COLORS.PURPLE_BG}; color: ${this.COLORS.WHITE};`;
        exitBtn.addEventListener('click', () => {
            resultWindow.remove();
            overlay.remove();
            this.createStartScreen();
        });
        resultWindow.appendChild(exitBtn);

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 199;
        `;
        
        this.container.appendChild(overlay);
        this.container.appendChild(resultWindow);
    }
    
    startGameLoop() {
        this.stopGameLoop();  
        this.gameLoop = setInterval(() => {
            this.updateUI();
            
            // AI回合处理
            if (this.game && this.game.is_ai_turn()) {
                this.handleAITurn();
            }
        }, 100);
    }
    
    stopGameLoop() {
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
            this.gameLoop = null;
        }
    }
    
    handleAITurn() {
        const game = this.game;
        
        switch (game.phase) {
            case 'ai_place1':
                // AI放置玩家选择的字母
                game.ai_place_letter();
                break;
            case 'ai_choose':
                // AI选择字母
                game.ai_choose_letter();
                break;
            case 'ai_place2':
                // AI放置自己选择的字母
                game.ai_place_letter();
                break;
        }
        
        // 检查游戏是否结束
        if (game.is_board_full(0) && game.is_board_full(1)) {
            this.stopGameLoop();
            setTimeout(() => this.showGameResult(), 500);
        }
    }
    
    updateUI() {
        if (!this.game) return;

        // 更新棋盘
        if (this.player1Board) this.player1Board.updateBoard();
        if (this.player2Board) this.player2Board.updateBoard();

        // 更新分数面板
        if (this.scorePanel) this.scorePanel.updateScores();

        // 更新控制区
        if (this.controls) {
            this.controls.updateTurnLabel();

            // 设置字母确认按钮状态（只在player_choose阶段启用）
            // PVP模式下允许两个玩家输入字母，PVE模式下只有玩家1可以输入
            const canConfirmLetter = this.game.phase === 'player_choose' &&
                                    (this.mode === 'PVP' || this.game.current_player === 0);
            this.controls.setConfirmButtonEnabled(canConfirmLetter);
        }

        // 更新AI遮罩透明度
        this.updateAICoverOpacity();
    }
    
    updateAICoverOpacity() {
        if (!this.aiCover || this.mode !== 'PVE') return;

        // 遮罩保持完全不透明，让玩家看不到电脑棋盘
        this.aiCover.style.opacity = '1.0';
    }
}

function setMenuScene() {
    document.body.classList.add("menu");
    document.body.classList.remove("game");
}

function setGameScene() {
    document.body.classList.add("game");
    document.body.classList.remove("menu");
}