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
        
        // 新增配色主题
        this.THEMES = {
            classic: {
                name: 'classic',
                colors: {
                    bg1: '#FAF8F3',
                    bg2: '#F2EEE6',
                    gray1: '#E3E3E3',
                    gray2: '#CFCFCF',
                    gray3: '#A9A9A9',
                    gray4: '#6A6A6A',
                    gray5: '#404040',
                    gray6: '#1F1F1F',
                    cream: '#F7E8B6',
                    sage: '#DCE6C7'
                }
            },
            sakura: {
                name: 'sakura',
                colors: {
                    bg1: '#FFE6EC',      // 樱花白
                    bg2: '#FFD1DD',      // 雾粉
                    pink1: '#FFB8C9',    // 浅樱粉
                    pink2: '#FF9DB5',    // 樱花粉
                    pink3: '#FF85A1',    // 蜜桃粉
                    pink4: '#F76C8A',    // 珊瑚粉
                    lavender: '#CFA6E8', // 淡紫
                    cream: '#FFF0C9',    // 奶油黄
                    mint: '#7FD6B4',     // 薄荷绿
                    sky: '#7DBAF8'       // 天空蓝
                }
            },
            Aqua: {
                name: 'Aqua',
                colors: {
                    bg1: '#F7FCFD',
                    blue1: '#DDF1F7',
                    blue2: '#BEE7F7',
                    blue3: '#8FD3F4',
                    green1: '#B8E5E0',
                    green2: '#A8E6CF',
                    green3: '#D6E9B7',
                    sand: '#F5EACF',
                    coral: '#F9E2D0',
                    shell: '#F4EBEE'
                }
            }
        };
        this.currentTheme = 'classic';
        
        this.initScale();
        this.init();
    }
    
    applyTheme(themeKey) {
        const theme = this.THEMES[themeKey];
        if (!theme) return;
        
        // 将主题颜色映射到COLORS对象（关键修复）
        const colorMap = {
            classic: {
                BEIGE_BG: '#F7E8B6',
                PURPLE_BG: '#9B59B6',
                RED_BROWN: '#8B0000',
                WHITE: '#FFFFFF',
                BROWN: '#404040',
                GREEN: '#2ECC71',
                BLUE: '#3498DB',
                ORANGE: '#E67E22'
            },
            sakura: {
                BEIGE_BG: '#FFF0C9',     // 奶油黄
                PURPLE_BG: '#FF9DB5',    // 樱花粉
                RED_BROWN: '#F76C8A',    // 珊瑚粉
                WHITE: '#FFFFFF',
                BROWN: '#5D4E5D',
                GREEN: '#7FD6B4',        // 薄荷绿
                BLUE: '#7DBAF8',         // 天空蓝
                ORANGE: '#FFB8C9'        // 浅樱粉
            },
            Aqua: {
                BEIGE_BG: '#B8E5E0',
                PURPLE_BG: '#8FD3F4',
                RED_BROWN: '#E8A87C',
                WHITE: '#FFFFFF',
                BROWN: '#2D5A5A',
                GREEN: '#8FD3F4',
                BLUE: '#4ECDC4',
                ORANGE: '#FF9F43'
            }
        };
        
        // 更新COLORS对象
        Object.assign(this.COLORS, colorMap[themeKey]);
        
        // 应用主题背景
        document.body.style.background = theme.colors.bg1;
        
        // 保存主题
        localStorage.setItem('crossword_theme', themeKey);
        this.currentTheme = themeKey;
        
        // 重新渲染当前界面以应用新配色
        this.reRenderCurrentScreen();
    }
    
    reRenderCurrentScreen() {
        if (document.body.className === 'menu') {
            // 如果在菜单界面，重新创建开始屏幕
            const currentScreen = this.container.querySelector('.start-screen, .difficulty-screen');
            if (currentScreen) {
                if (currentScreen.classList.contains('difficulty-screen')) {
                    this.chooseDifficulty();
                } else {
                    this.createStartScreen();
                }
            }
        } else if (document.body.className === 'game') {
            // 如果在游戏界面，重新创建游戏
            if (this.game) {
                const mode = this.mode;
                const difficulty = this.difficulty;
                this.stopGameLoop();
                this.initGame(mode, difficulty);
            }
        }
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
        // 加载保存的主题或使用默认主题
        const savedTheme = localStorage.getItem('crossword_theme') || 'classic';
        this.currentTheme = savedTheme;
        this.applyTheme(savedTheme);
        
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
        
        const settingsBtn = document.createElement('button');
        settingsBtn.textContent = 'Settings';
        settingsBtn.style.cssText = buttonStyle;
        settingsBtn.addEventListener('click', () => this.showSettings());
        startDiv.appendChild(settingsBtn);
        
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
            background: ${this.COLORS.PURPLE_BG};
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
    
    showSettings() {
        document.body.className = 'menu';
        this.container.innerHTML = '';
        
        const settingsDiv = document.createElement('div');
        settingsDiv.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
            min-height: 100vh;
        `;
        
        const title = document.createElement('h2');
        title.textContent = 'Settings';
        title.style.cssText = `
            font-family: 'Comic Sans MS', cursive;
            font-size: 32px;
            color: ${this.COLORS.RED_BROWN};
            margin-bottom: 30px;
        `;
        settingsDiv.appendChild(title);
        
        // 界面缩放控制区域
        const scaleSection = document.createElement('div');
        scaleSection.style.cssText = `
            background: ${this.COLORS.WHITE};
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
            margin-bottom: 25px;
            text-align: center;
        `;
        
        const scaleTitle = document.createElement('h3');
        scaleTitle.textContent = 'Screen Zoom';
        scaleTitle.style.cssText = `
            font-family: 'Comic Sans MS', cursive;
            font-size: 20px;
            color: ${this.COLORS.PURPLE_BG};
            margin-bottom: 15px;
        `;
        scaleSection.appendChild(scaleTitle);
        
        // 当前缩放显示
        const currentScaleDisplay = document.createElement('span');
        const currentTransform = this.container.style.transform;
        const match = currentTransform.match(/scale\(([\d.]+)\)/);
        const currentScale = match ? parseFloat(match[1]) : 1;
        currentScaleDisplay.textContent = `${Math.round(currentScale * 100)}%`;
        currentScaleDisplay.style.cssText = `
            font-family: 'Comic Sans MS', cursive;
            font-size: 24px;
            font-weight: bold;
            color: ${this.COLORS.BROWN};
            display: block;
            margin-bottom: 15px;
        `;
        scaleSection.appendChild(currentScaleDisplay);
        
        // 缩放控制按钮
        const scaleControls = document.createElement('div');
        scaleControls.style.cssText = `
            display: flex;
            gap: 15px;
            justify-content: center;
        `;
        
        const zoomInBtn = document.createElement('button');
        zoomInBtn.textContent = '+';
        zoomInBtn.style.cssText = `
            width: 45px;
            height: 45px;
            font-size: 24px;
            font-weight: bold;
            background: ${this.COLORS.GREEN};
            color: ${this.COLORS.WHITE};
            border: none;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            transition: all 0.2s ease;
        `;
        zoomInBtn.addEventListener('click', () => {
            const currentTransform = this.container.style.transform;
            const match = currentTransform.match(/scale\(([\d.]+)\)/);
            const currentScale = match ? parseFloat(match[1]) : 1;
            const newScale = Math.min(currentScale + 0.1, 2);
            this.container.style.transform = `scale(${newScale})`;
            currentScaleDisplay.textContent = `${Math.round(newScale * 100)}%`;
        });
        zoomInBtn.addEventListener('mouseenter', () => {
            zoomInBtn.style.transform = 'scale(1.1)';
        });
        zoomInBtn.addEventListener('mouseleave', () => {
            zoomInBtn.style.transform = 'scale(1)';
        });
        scaleControls.appendChild(zoomInBtn);
        
        const zoomOutBtn = document.createElement('button');
        zoomOutBtn.textContent = '-';
        zoomOutBtn.style.cssText = `
            width: 45px;
            height: 45px;
            font-size: 24px;
            font-weight: bold;
            background: ${this.COLORS.RED_BROWN};
            color: ${this.COLORS.WHITE};
            border: none;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            transition: all 0.2s ease;
        `;
        zoomOutBtn.addEventListener('click', () => {
            const currentTransform = this.container.style.transform;
            const match = currentTransform.match(/scale\(([\d.]+)\)/);
            const currentScale = match ? parseFloat(match[1]) : 1;
            const newScale = Math.max(currentScale - 0.1, 0.1);
            this.container.style.transform = `scale(${newScale})`;
            currentScaleDisplay.textContent = `${Math.round(newScale * 100)}%`;
        });
        zoomOutBtn.addEventListener('mouseenter', () => {
            zoomOutBtn.style.transform = 'scale(1.1)';
        });
        zoomOutBtn.addEventListener('mouseleave', () => {
            zoomOutBtn.style.transform = 'scale(1)';
        });
        scaleControls.appendChild(zoomOutBtn);
        
        const resetBtn = document.createElement('button');
        resetBtn.textContent = '⟲';
        resetBtn.style.cssText = `
            width: 45px;
            height: 45px;
            font-size: 22px;
            background: ${this.COLORS.BROWN};
            color: ${this.COLORS.WHITE};
            border: none;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            transition: all 0.2s ease;
        `;
        resetBtn.addEventListener('click', () => {
            this.container.style.transform = 'scale(1)';
            currentScaleDisplay.textContent = '100%';
        });
        resetBtn.addEventListener('mouseenter', () => {
            resetBtn.style.transform = 'scale(1.1)';
        });
        resetBtn.addEventListener('mouseleave', () => {
            resetBtn.style.transform = 'scale(1)';
        });
        scaleControls.appendChild(resetBtn);
        scaleSection.appendChild(scaleControls);
        settingsDiv.appendChild(scaleSection);
        
        // 新增配色主题选择区域
        const themeSection = document.createElement('div');
        themeSection.style.cssText = `
            background: ${this.COLORS.WHITE};
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
            margin-bottom: 25px;
            text-align: center;
        `;
        
        const themeTitle = document.createElement('h3');
        themeTitle.textContent = 'Color Theme';
        themeTitle.style.cssText = `
            font-family: 'Comic Sans MS', cursive;
            font-size: 20px;
            color: ${this.COLORS.PURPLE_BG};
            margin-bottom: 15px;
        `;
        themeSection.appendChild(themeTitle);
        
        const themeButtons = document.createElement('div');
        themeButtons.style.cssText = `
            display: flex;
            gap: 10px;
            justify-content: center;
        `;
        
        Object.keys(this.THEMES).forEach((themeKey) => {
            const theme = this.THEMES[themeKey];
            const themeBtn = document.createElement('button');
            themeBtn.textContent = theme.name;
            themeBtn.style.cssText = `
                padding: 10px 20px;
                font-family: 'Comic Sans MS', cursive;
                font-size: 16px;
                background: ${themeKey === this.currentTheme ? this.COLORS.PURPLE_BG : this.COLORS.WHITE};
                color: ${themeKey === this.currentTheme ? this.COLORS.WHITE : this.COLORS.BROWN};
                border: 2px solid ${this.COLORS.PURPLE_BG};
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.3s ease;
            `;
            themeBtn.addEventListener('click', () => {
                this.currentTheme = themeKey;
                this.applyTheme(themeKey);
                // 更新按钮样式
                Object.keys(this.THEMES).forEach((key) => {
                    const btn = themeButtons.querySelector(`[data-theme="${key}"]`);
                    if (btn) {
                        btn.style.background = key === themeKey ? this.COLORS.PURPLE_BG : this.COLORS.WHITE;
                        btn.style.color = key === themeKey ? this.COLORS.WHITE : this.COLORS.BROWN;
                    }
                });
            });
            themeBtn.setAttribute('data-theme', themeKey);
            themeBtn.addEventListener('mouseenter', () => {
                themeBtn.style.transform = 'scale(1.05)';
            });
            themeBtn.addEventListener('mouseleave', () => {
                themeBtn.style.transform = 'scale(1)';
            });
            themeButtons.appendChild(themeBtn);
        });
        
        themeSection.appendChild(themeButtons);
        settingsDiv.appendChild(themeSection);
        
        // 游戏引导入口
        const tutorialBtn = document.createElement('button');
        tutorialBtn.textContent = 'Game Guide';
        tutorialBtn.style.cssText = `
            width: 220px;
            height: 55px;
            margin-bottom: 15px;
            font-family: 'Comic Sans MS', cursive;
            font-size: 18px;
            background: ${this.COLORS.ORANGE};
            color: ${this.COLORS.WHITE};
            border: none;
            border-radius: 15px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        `;
        tutorialBtn.addEventListener('click', () => this.showTutorial());
        settingsDiv.appendChild(tutorialBtn);
        
        // 返回主菜单按钮
        const backBtn = document.createElement('button');
        backBtn.textContent = 'Back to Menu';
        backBtn.style.cssText = `
            width: 220px;
            height: 55px;
            font-family: 'Comic Sans MS', cursive;
            font-size: 18px;
            background: ${this.COLORS.PURPLE_BG};
            color: ${this.COLORS.WHITE};
            border: none;
            border-radius: 15px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        `;
        backBtn.addEventListener('click', () => this.createStartScreen());
        settingsDiv.appendChild(backBtn);
        
        this.container.appendChild(settingsDiv);
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
        backBtn.addEventListener('click', () => this.showSettings());
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
        
        // 缩放控制按钮
        const zoomBtn = document.createElement('button');
        zoomBtn.textContent = 'Screen Zoom';
        zoomBtn.style.cssText = buttonStyle + `background: ${this.COLORS.BLUE};`;
        
        // 缩放控件弹窗
        let scalePopup = null;
        
        zoomBtn.addEventListener('click', () => {
            if (scalePopup) {
                scalePopup.remove();
                scalePopup = null;
                return;
            }
            
            scalePopup = document.createElement('div');
            scalePopup.style.cssText = `
                position: absolute;
                top: 100%;
                left: 50%;
                transform: translateX(-50%);
                background: ${this.COLORS.WHITE};
                padding: 15px;
                border-radius: 10px;
                box-shadow: 0 4px 10px rgba(0,0,0,0.2);
                z-index: 300;
                display: flex;
                align-items: center;
                gap: 10px;
                margin-top: 5px;
            `;
            
            const popupZoomOutBtn = document.createElement('button');
            popupZoomOutBtn.textContent = '-';
            popupZoomOutBtn.style.cssText = `
                width: 35px;
                height: 35px;
                font-size: 18px;
                font-weight: bold;
                background: ${this.COLORS.RED_BROWN};
                color: ${this.COLORS.WHITE};
                border: none;
                border-radius: 50%;
                cursor: pointer;
            `;
            popupZoomOutBtn.addEventListener('click', () => {
                const currentTransform = this.container.style.transform;
                const match = currentTransform.match(/scale\(([\d.]+)\)/);
                const currentScale = match ? parseFloat(match[1]) : 1;
                const newScale = Math.max(currentScale - 0.1, 0.1);
                this.container.style.transform = `scale(${newScale})`;
                popupScaleDisplay.textContent = `${Math.round(newScale * 100)}%`;
            });
            scalePopup.appendChild(popupZoomOutBtn);
            
            const popupScaleDisplay = document.createElement('span');
            const currentTransform = this.container.style.transform;
            const match = currentTransform.match(/scale\(([\d.]+)\)/);
            const currentScale = match ? parseFloat(match[1]) : 1;
            popupScaleDisplay.textContent = `${Math.round(currentScale * 100)}%`;
            popupScaleDisplay.style.cssText = `
                font-family: 'Comic Sans MS', cursive;
                font-size: 14px;
                font-weight: bold;
                color: ${this.COLORS.BROWN};
                min-width: 45px;
                text-align: center;
            `;
            scalePopup.appendChild(popupScaleDisplay);
            
            const popupZoomInBtn = document.createElement('button');
            popupZoomInBtn.textContent = '+';
            popupZoomInBtn.style.cssText = `
                width: 35px;
                height: 35px;
                font-size: 18px;
                font-weight: bold;
                background: ${this.COLORS.GREEN};
                color: ${this.COLORS.WHITE};
                border: none;
                border-radius: 50%;
                cursor: pointer;
            `;
            popupZoomInBtn.addEventListener('click', () => {
                const currentTransform = this.container.style.transform;
                const match = currentTransform.match(/scale\(([\d.]+)\)/);
                const currentScale = match ? parseFloat(match[1]) : 1;
                const newScale = Math.min(currentScale + 0.1, 2);
                this.container.style.transform = `scale(${newScale})`;
                popupScaleDisplay.textContent = `${Math.round(newScale * 100)}%`;
            });
            scalePopup.appendChild(popupZoomInBtn);
            
            menuWindow.appendChild(scalePopup);
        });
        menuWindow.appendChild(zoomBtn);
        
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