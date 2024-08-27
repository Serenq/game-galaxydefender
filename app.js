
function isCollision(a, b){
    return a.x < b.x + b.w
        && a.x + a.w > b.x
        && a.y < b.y + b.h
        && a.y + a.h > b.y
}

function rand(min, max){return Math.random() * Math.round(max - min) + min}

class Canvas {
    constructor({...rest} = {}){
        this.canvas = document.querySelector(rest.elem);
        this.h = undefined;
        this.w = undefined;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize(){
        this.w = this.canvas.width = this.canvas.offsetWidth;
        this.h = this.canvas.height = this.canvas.offsetHeight;
    }

    getContext(){return this.canvas.getContext('2d')}
}

class Controlls {
    constructor({game}){
        this.keyKit = ['KeyA','KeyD','Space'];
        this.key = {};

        window.addEventListener('keydown', (e) => this.keyHandler(e));
        window.addEventListener('keyup', (e) => this.keyHandler(e));
    }

    keyHandler(e){
        if(!this.keyKit.includes(e.code)){return}
        this.key[e.code] = (e.type === 'keydown') ? true : false;
    }
}

class Figure {
    constructor(game){
        this.game = game;
        this.size = 40;
        this.x = 0;
        this.y = 0;
        this.h = 20;
        this.w = 20;
        this.isBoundLeft = false;
        this.isBoundRight = false;
    }
    // Проверить границы
    updateBounds(){
        this.isBoundLeft = (this.x > 0);
        this.isBoundRight = (this.x + this.w < this.game.canv_game.w);
    }

    logic(){}
}

// Звёздочка
class Star extends Figure {
    constructor(game){
        super(game);
        this.size = 5;
        this.speed = 1;
        this.color = '#E6E6E6';
        this.x = rand(0, this.game.canv_back.w);
        this.y = rand(0, this.game.canv_back.h);
        this.vy = this.y;
    }

    update(cc){
        this.logic();
        cc.fillStyle = this.color;
        cc.fillRect(this.x, this.y, this.size, this.size);
    }

    logic(){
        this.vy += this.speed;
        this.y = this.vy;
        if(this.y >= this.game.canv_back.h){
            this.vy = 0;
            this.x = rand(0, this.game.canv_back.w);
        };
    }
}

// Игрок
class Player extends Figure {
    constructor(game){
        super(game);
        
        this.h = 60;
        this.w = 200;
        this.y = game.canv_game.h - this.h - 30;
        this.x = (game.canv_game.w - this.w) / 2;
        this.vx = this.x;
        this.vy = this.y;
        this.color = '#06A7FF';
        this.speed = 12;
        this.coolDownMax = 30;
        this.shootCooldown = this.coolDownMax;
    }

    update(cc){
        (this.shootCooldown < this.coolDownMax) ? this.shootCooldown++ : this.shootCooldown;
        cc.fillStyle = this.color;
        cc.fillRect(this.x, this.y, this.w, this.h);
        this.logic();
        return this;
    }

    logic(){
        this.updateBounds();
        // В лево
        if(this.game.controlls.key.KeyA && this.isBoundLeft){
            this.vx += -this.speed;
            this.x = this.vx;
        }
        // В право
        if(this.game.controlls.key.KeyD && this.isBoundRight){
            this.vx += this.speed;
            this.x = this.vx;
        }
        // ВЫСТРЕЛ и перезарядка
        if(this.game.controlls.key.Space && this.shootCooldown === this.coolDownMax){
            this.game.bullet_pool.spawn( Bullet );
            this.shootCooldown = 0;
            this.game.score_bullets++;
        }
    }
}

// Враг
class Enemy extends Figure {
    constructor(game){
        super(game);
        this.size = this.w = this.h = 60;
        this.x = rand(100, this.game.canv_game.w - 100);
        this.y = 0;
        this.vx = 1;
        this.vy = 1;
        this.color = '#EC06FF';
        this.speed = 1.5;
        this.alive = true;
        this.use = false;
    }

    update(cc){
        cc.fillStyle = this.color;
        cc.fillRect(this.x, this.y, this.size, this.size);
        this.logic();
        return this;
    }

    logic(){
        this.updateBounds();
        this.vy += this.speed;
        this.y = this.vy;
    }
}

// Пуля
class Bullet extends Figure {
    constructor(game){
        super(game);
        this.w = 5;
        this.h = 40;
        this.x = this.game.player.x + this.game.player.w / 2;
        this.y = this.game.player.y - this.h;
        this.vy = this.y;
        this.speed = 30;
        this.color = 'red';
    }

    update(cc){
        cc.fillStyle = this.color;
        cc.fillRect(this.x, this.y, this.w, this.h);
        this.logic();
        return this;
    }

    logic(){
        this.vy += -this.speed;
        this.y = this.vy;
    }
}

// Обработчик объектов
class ObjectPool {
    constructor(game){
        this.game = game;
        this.storage = [];
    }

    spawn(obj){}

    update(cc){
        this.storage.forEach((item) => {
            this.logic(item);
            item.update(cc);
        });
    }

    logic(item){}
}

class EnemyPOOL extends ObjectPool {
    constructor(game){
        super(game);
    }

    spawn(obj){
        if(typeof(obj) !== 'function'){return}
        this.storage.push (new obj(this.game) );
        return this;
    }

    delete(index){
        this.storage.splice(index, 1);
    }

    logic(enemy){
        if(enemy.y > this.game.canv_game.h - this.game.player.h){
            let index = this.storage.indexOf(enemy);
            this.storage.splice(index, 1);
            this.game.score += -5; // ШТРАФ: враг прошёл
        }

        if( isCollision(enemy, this.game.player) ){
            let index = this.storage.indexOf(enemy);
            this.storage.splice(index, 1);
            this.game.score += -5; // ШТРАФ: Врезался в игрока
        }
    }
}

class BulletPOOL extends ObjectPool {
    constructor(game){
        super(game);
    }

    spawn(obj){
        if(typeof(obj) !== 'function'){return}
        this.storage.push (new obj(this.game) );
        return this;
    }

    logic(bullet){
        let bullet_index = this.storage.indexOf(bullet);
        // Удалить пулю за экраном
        if(bullet.y < 0){
            this.storage.splice(bullet_index, 1);
            this.game.score += -1; // ШТРАФ: промах
        }
        
        // Столкновение с врагами
        this.game.enemy_pool.storage.forEach((enemy, index) => {
            if( isCollision(bullet, enemy) ){
                this.game.enemy_pool.delete(index);
                this.storage.splice(bullet_index, 1);
                this.game.score_enemyes++; // Счёт врагов
                this.game.score += 5; // НАГРАДА: очки
            }
        });
    }
}

class StarPOOL extends ObjectPool {
    constructor(game){
        super(game);
        this.count = 30;

        for(let i = 0; i < this.count; i++){
            this.storage.push( new Star(this.game) );
        }
    }
}

class Text {
    constructor(game){
        this.game = game;
        this.x = 0;
        this.y = 0;
        this.title = 'Заголовок';
        this.value = 'Значение';
        this.fontSize = 36;
        this.fontFam = 'monospace';
        this.color = '#C7AC00';
    }

    update(cc){
        cc.fillStyle = this.color;
        cc.font = `bold ${this.fontSize}px ${this.fontFam}`;
        cc.fillText(`${this.title}: ${this.value}`, this.x, this.y);
        return this;
    }

    setProps({...rest} = {}){
        this.title = rest.title;
        this.value = rest.value;
        this.x = rest.x;
        this.y = rest.y;
        this.color = rest.color || this.color;
        return this;
    }
}

class Game {
    constructor(){
        // Сущности
        this.canv_back = new Canvas({elem: '#background'});
        this.canv_game = new Canvas({elem: '#game'});
        this.canv_score = new Canvas({elem: '#score'});
        this.player = new Player(this);
        // Наборы
        this.enemy_pool = new EnemyPOOL(this);
        this.bullet_pool = new BulletPOOL(this);
        this.star_pool = new StarPOOL(this);
        // Управление
        this.controlls = new Controlls(this);
        // Текст
        this.show_score = new Text(this);
        this.show_enemyes = new Text(this);
        this.show_bullets = new Text(this);
        this.show_gameTitle = new Text(this);
        this.show_controlls = new Text(this);
        // Очки
        this.score = 0;
        this.score_enemyes = 0;
        this.score_bullets = 0;
        // Тайминги
        this.frame = 0;
    }

    run(deltatime){
        this.frame++;
        this.score = (this.score <= 0) ? 0 : this.score;
        // Очистка слоёв
        this.canv_back.getContext().clearRect(0, 0, this.canv_back.w, this.canv_back.h);
        this.canv_game.getContext().clearRect(0, 0, this.canv_game.w, this.canv_game.h);
        this.canv_score.getContext().clearRect(0, 0, this.canv_score.w, this.canv_score.h);

        // Отрисовка объектов
        this.star_pool.update(this.canv_back.getContext());
        this.player.update(this.canv_game.getContext());
        this.enemy_pool.update(this.canv_game.getContext());
        this.bullet_pool.update(this.canv_game.getContext());

        // Отрисовка текста
        this.show_gameTitle
            .setProps({title: 'Игра', value: 'ГОЛАКТЕКО АПАСНОСТЕ', x: 20, y: 30, color: '#AF0039'})
            .update(this.canv_score.getContext());
            
        this.show_controlls
            .setProps({title: 'Управление', value: 'W, A, SPACE', x: 20, y: 60, color: '#C75C00'})
            .update(this.canv_score.getContext());

        // Отрисовка очков
        this.show_score
            .setProps({title: 'Очки', value: this.score, x: 20, y: 90})
            .update(this.canv_score.getContext());
        
        this.show_enemyes
            .setProps({title: 'Враги', value: this.score_enemyes, x: 20, y: 120})
            .update(this.canv_score.getContext());
        
        this.show_bullets
            .setProps({title: 'Пули', value: this.score_bullets, x: 20, y: 150})
            .update(this.canv_score.getContext());

        // Создание ВРАГА с интервалом
        if(this.frame % 60 == 0 && this.enemy_pool.storage.length < 10){
            this.enemy_pool.spawn( Enemy );
        }
    }
}

window.addEventListener('load', function(){
    console.log(`%c"Галактеко апасносте by Serenq"`, "color: #ace600; font-style: italic; background-color: #444; padding: 0 20px");
    const game = new Game();
    // let deltatime = 0;

    function animate(time=0){
        // deltatime = time - deltatime;
        game.run( /* time / 1000 */ );
        
        // deltatime = time;
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
});