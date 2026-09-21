// 文件开头添加正确的导入
import { GameUtils } from '../utils/gameUtils.js';

export class GameControls {
    constructor(app, parent) {
        this.app = app;
        this.parent = parent;
        this.turnLabel = null;
        this.letterInput = null;
        this.confirmButton = null;
        this.init();
    }
    
    init() {
        const controlsDiv = document.createElement('div');
        controlsDiv.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            padding: 15px 30px;
            background: ${this.app.COLORS.WHITE};
            border-radius: 15px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
            margin-bottom: 20px;
        `;
        
        // 回合标签
        this.turnLabel = document.createElement('span');
        this.turnLabel.style.cssText = `
            font-family: 'Comic Sans MS', cursive;
            font-size: 18px;
            color: ${this.app.COLORS.PURPLE_BG};
            min-width: 250px;
            text-align: center;
        `;
        this.turnLabel.textContent = 'Player 1, please enter a letter';
        controlsDiv.appendChild(this.turnLabel);
        
        // 字母输入框
        this.letterInput = document.createElement('input');
        this.letterInput.type = 'text';
        this.letterInput.maxLength = 1;
        this.letterInput.style.cssText = `
            width: 60px;
            height: 45px;
            font-family: 'Comic Sans MS', cursive;
            font-size: 24px;
            text-align: center;
            background: ${this.app.COLORS.PURPLE_BG};
            color: ${this.app.COLORS.WHITE};
            border: none;
            border-radius: 10px;
            text-transform: uppercase;
        `;
        this.letterInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.confirmLetter();
            }
        });
        controlsDiv.appendChild(this.letterInput);
        
        // 确认按钮
        this.confirmButton = document.createElement('button');
        this.confirmButton.textContent = 'Confirm';
        this.confirmButton.style.cssText = `
            padding: 12px 30px;
            font-family: 'Comic Sans MS', cursive;
            font-size: 18px;
            background: ${this.app.COLORS.PURPLE_BG};
            color: ${this.app.COLORS.WHITE};
            border: none;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        this.confirmButton.addEventListener('click', () => this.confirmLetter());
        controlsDiv.appendChild(this.confirmButton);
        
        // 历史记录和菜单按钮
        const rightButtons = document.createElement('div');
        rightButtons.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-left: 20px;
        `;
        
        const historyBtn = document.createElement('button');
        historyBtn.textContent = 'View History';
        historyBtn.style.cssText = `
            padding: 8px 20px;
            font-family: 'Comic Sans MS', cursive;
            font-size: 14px;
            background: ${this.app.COLORS.BLUE};
            color: ${this.app.COLORS.WHITE};
            border: none;
            border-radius: 8px;
            cursor: pointer;
        `;
        historyBtn.addEventListener('click', () => this.app.showHistory());
        rightButtons.appendChild(historyBtn);
        
        const menuBtn = document.createElement('button');
        menuBtn.textContent = 'Menu';
        menuBtn.style.cssText = `
            padding: 8px 20px;
            font-family: 'Comic Sans MS', cursive;
            font-size: 14px;
            background: ${this.app.COLORS.ORANGE};
            color: ${this.app.COLORS.WHITE};
            border: none;
            border-radius: 8px;
            cursor: pointer;
        `;
        menuBtn.addEventListener('click', () => this.app.showMenu());
        rightButtons.appendChild(menuBtn);
        
        controlsDiv.appendChild(rightButtons);
        this.parent.appendChild(controlsDiv);
    }
    
    confirmLetter() {
        const letter = this.letterInput.value.toUpperCase();
        if (!letter.match(/^[A-Z]$/)) {
            alert('Please enter a valid letter (A-Z)');
            return;
        }
    
        const game = this.app.game;
        if (game.phase !== 'player_choose') {
            alert('Not the time to enter a letter.');
            return;
        }
    
        game.set_current_letter(letter);
        this.app.currentLetter = letter;
        this.letterInput.value = '';
    
        // 禁用输入框和确认按钮
        this.letterInput.disabled = true;
        this.confirmButton.disabled = true;
    
        // PVP模式下记录letter_owner
        if (this.app.mode === 'PVP') {
            game.letter_owner = game.current_player;
        }
    
        // 将阶段转换为 player_place（修复流程问题）
        game.phase = 'player_place';
    
        this.updateTurnLabel();
    
        // 刷新UI
        this.app.updateUI();
    }
    
    updateTurnLabel() {
        this.turnLabel.textContent = GameUtils.getPhaseText(this.app.game);
    }
    
    setConfirmButtonEnabled(enabled) {
        this.confirmButton.disabled = !enabled;
        this.confirmButton.style.opacity = enabled ? 1 : 0.5;
        this.confirmButton.style.cursor = enabled ? 'pointer' : 'not-allowed';
    }
}