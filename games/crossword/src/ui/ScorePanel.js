export class ScorePanel {
    constructor(app, parent) {
        this.app = app;
        this.parent = parent;
        this.panelDiv = null;
        this.player1Score = null;
        this.player2Score = null;
        this.vsLabel = null;
        this.init();
    }
    
    init() {
        this.panelDiv = document.createElement('div');
        this.panelDiv.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 30px;
            padding: 15px 40px;
            background: ${this.app.COLORS.PURPLE_BG};
            border-radius: 15px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            margin-top: 20px;
        `;
        
        // 玩家1分数
        const player1Div = document.createElement('div');
        player1Div.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
        `;
        
        const player1Label = document.createElement('span');
        player1Label.textContent = 'Player 1';
        player1Label.style.cssText = `
            font-family: 'Comic Sans MS', cursive;
            font-size: 16px;
            color: ${this.app.COLORS.WHITE};
            margin-bottom: 5px;
        `;
        player1Div.appendChild(player1Label);
        
        this.player1Score = document.createElement('span');
        this.player1Score.textContent = '0';
        this.player1Score.style.cssText = `
            font-family: 'Comic Sans MS', cursive;
            font-size: 36px;
            font-weight: bold;
            color: ${this.app.COLORS.WHITE};
        `;
        player1Div.appendChild(this.player1Score);
        this.panelDiv.appendChild(player1Div);
        
        // VS标签
        this.vsLabel = document.createElement('span');
        this.vsLabel.textContent = 'VS';
        this.vsLabel.style.cssText = `
            font-family: 'Comic Sans MS', cursive;
            font-size: 24px;
            font-weight: bold;
            color: ${this.app.COLORS.WHITE};
        `;
        this.panelDiv.appendChild(this.vsLabel);
        
        // 玩家2/电脑分数
        const player2Div = document.createElement('div');
        player2Div.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
        `;
        
        const player2Label = document.createElement('span');
        player2Label.textContent = this.app.mode === 'PVE' ? 'Computer' : 'Player 2';
        player2Label.style.cssText = `
            font-family: 'Comic Sans MS', cursive;
            font-size: 16px;
            color: ${this.app.COLORS.WHITE};
            margin-bottom: 5px;
        `;
        player2Div.appendChild(player2Label);
        
        this.player2Score = document.createElement('span');
        this.player2Score.textContent = '0';
        this.player2Score.style.cssText = `
            font-family: 'Comic Sans MS', cursive;
            font-size: 36px;
            font-weight: bold;
            color: ${this.app.COLORS.WHITE};
        `;
        player2Div.appendChild(this.player2Score);
        this.panelDiv.appendChild(player2Div);
        
        this.parent.appendChild(this.panelDiv);
    }
    
    updateScores() {
        if (!this.app.game) return;
        
        const player1Total = this.app.game.calculate_player_score(0);
        const player2Total = this.app.game.calculate_player_score(1);
        
        this.player1Score.textContent = player1Total;
        this.player2Score.textContent = player2Total;
    }
}