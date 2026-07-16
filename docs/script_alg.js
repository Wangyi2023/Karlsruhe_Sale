// < PART 0 - DEFINE GLOBAL-VARIABLES >

/*
X 为矩阵的行数，Y 为列数，N 为当前雷总数，N_target 为目标雷总数，DATA 为存储局内核心信息的容器，数据类型为 Uint8Array，具体存储方式见下表。
CELL_ELEMENTS 只用于存储单个方格对应的页面上的元素（div）的索引，只用于渲染游戏界面。
 */
let X, Y, N, N_target, DATA, CELL_ELEMENTS;
/*
以下是我设计的用 8 位存储单个坐标核心信息的方式：
-------------------------------------------------------------------------------------
| internal-mark-safe   | internal-mark-mine   | covered   | mine   | number (0-8)   |
| bit 7                | bit 6                | bit 5     | bit 4  | bit 0-3        |
-------------------------------------------------------------------------------------
通过与以下掩码位运算可提取和修改它们的各项信息。
 */
const Nr_ = 0b00001111;
const Mi_ = 0b00010000;
const Cv_ = 0b00100000;
const Im_ = 0b01000000;
const Is_ = 0b10000000;
/*
游戏 ID 的作用是在新的一局游戏里中断上一局游戏的延迟操作。
 */
let ID = 0;
/*
DX 和 DY 的作用是快速读取一个坐标的所有周围坐标。
 */
const DX = [-1, 0, 1, 0, -1, 1, 1, -1];
const DY = [0, 1, 0, -1, 1, 1, -1, -1];
/*
以下是测试列表，在测试重置算法的测试模式中会创建 8x8 的使用预设方式排布雷的棋盘，并自动打开右上角 (0, 7) 坐标。
测试通过快捷键 shift + t 或在控制台使用 test() 函数调用，以下测试主要用于检测 reset_mines 功能。
 */
const TEST_CONFIG = {
    1  : { Type: 1, Mines: [[0, 0], [2, 0], [2, 1]] },
    2  : { Type: 1, Mines: [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1]] },
    3  : { Type: 1, Mines: [[0, 0], [2, 0], [3, 0], [5, 0], [5, 1]] },
    4  : { Type: 1, Mines: [[0, 0], [2, 0], [3, 0], [5, 0], [6, 0], [7, 2], [7, 3], [7, 5], [7, 6]] },
    5  : { Type: 1, Mines: [[0, 0], [1, 1], [2, 2]] },
    6  : { Type: 1, Mines: [[0, 1], [1, 0], [2, 2]] },
    7  : { Type: 2, Mines: [[1, 2], [2, 0], [3, 1], [3, 2], [4, 0], [5, 2]] },
    8  : { Type: 2, Mines: [[1, 2], [2, 1], [3, 0], [3, 2], [4, 1], [5, 2]] },
    9  : { Type: 2, Mines: [[0, 1], [1, 0], [2, 2], [5, 5], [6, 7], [7, 6]] },
    10 : { Type: 2, Mines: [[0, 0], [0, 1], [1, 0], [2, 2], [5, 5], [6, 6], [7, 7]] },
    11 : { Type: 2, Mines: [[0, 0], [0, 1], [1, 0], [2, 2], [5, 5], [6, 6]] },
    12 : { Type: 2, Mines: [[1, 1], [2, 2], [5, 5], [6, 6]] },
    13 : { Type: 3, Mines: [[0, 0], [0, 2], [1, 1], [2, 1], [4, 1], [4, 2], [5, 0], [5, 1], [5, 2]] },
    14 : { Type: 3, Mines: [[0, 1], [0, 2], [1, 1], [3, 1], [4, 1], [4, 2], [5, 0], [5, 1], [5, 2]] },
    15 : { Type: 3, Mines: [[0, 0], [0, 2], [2, 1], [4, 2], [5, 0], [5, 1], [5, 2]] },
    16 : { Type: 3, Mines: [[0, 1], [0, 2], [3, 1], [4, 2], [5, 0], [5, 1], [5, 2]] },
}
const TEST_SIZE = Object.keys(TEST_CONFIG).length;
/*
以下是预设的消息列表，普通消息的标题，内容和进度条的颜色在此编辑。特殊的 Test Result Notice 没有预设。
 */
const NOTICE_CONFIG = {
    default: {
        title: "Notice.",
        content: "Default Notice Content - 1024 0024.",
        color: 'rgba(0, 150, 255, 1)'
    },
    congrats: {
        title: "Congratulations.",
        content: "You've successfully completed Minesweeper.",
        color: 'rgba(0, 220, 80, 1)'
    },
    failed: {
        title: "Failed.",
        content: "You triggered a mine.",
        color: 'rgba(255, 20, 53, 1)'
    },
    reset_complete: {
        title: "Reset Complete.",
        content: "Mines successfully redistributed.",
        color: 'rgba(0, 220, 80, 1)'
    },
    reset_failed: {
        title: "Reset Failed.",
        content: "Cannot redistribute mines while preserving constraints.",
        color: 'rgba(255, 20, 53, 1)'
    },
    test_start: {
        title: "Test Mode Activated.",
        content: "Sidebar adjusted, shortcuts disabled, background locked to default.",
        color: 'rgba(0, 150, 255, 1)'
    },
    test_end: {
        title: "Test Mode Deactivated.",
        content: "Sidebar adjusted, shortcuts enabled, background unlocked.",
        color: 'rgba(0, 150, 255, 1)'
    },
    copied: {
        title: "Hint.",
        content: "Email address copied to clipboard.",
        color: 'rgba(0, 150, 255, 1)'
    },
    animation_off: {
        title: "Animation OFF.",
        content: "Animation turned off for better performance on large boards.",
        color: 'rgba(255, 150, 0, 1)'
    },
    screenshot: {
        title: "Screenshot Completed.",
        content: "Screenshot saved to default folder",
        color: 'rgba(0, 220, 80, 1)'
    },
    progression_blocked: {
        title: "Progression Blocked.",
        content: "Progression blocked by algorithm divergence. Please update the verifier-result via the 'Analyse' button, or restart the game.",
        color: 'rgba(255, 20, 53, 1)'
    }
};
/*
以下是用于计算位图大小的表格，对于此项目中的位图可使用查表法统计存在于位图中的元素数量。
 */
const BIT_COUNT_TABLE = new Uint8Array(256);
for (let i = 1; i < 256; i++) {
    BIT_COUNT_TABLE[i] = (i & 1) + BIT_COUNT_TABLE[i >> 1];
}
/*
对于页面中被频繁调用且在页面初始化后不再改变的元素，使用下方变量存储它们的地址。
 */
let cursor_element, hint_element, solvability_info_element, time_info_element;
/*
以下常量用于调整画面，动画和机制。
 */
const CELL_SIZE = 24;
const FONT_SIZE = 16;
const ANIMATION_LIMIT = 1200;
const CSP_ALGORITHM_LIMIT = 32;
const NOTICE_TIME_LIMIT = 800;
const REVEAL_DELAY = 4;
const REVEAL_DELAY_LIMIT = 200;
const AUTO_SOLVE_INTERVAL = 100;
const AUTO_SOLVING_TEST_INTERVAL = 800;
const NOTICE_DISPLAY_TIME = 4500;
/*
以下变量用于存储游戏状态和模式。
 */
let current_difficulty = 'high';
let current_test_id = null;

let first_click = true;
let mines_inited = true;
let game_over = false;
let is_solving = false;
let is_testing = false;
let solvable = false;

let mines_visible = false;
let calculate_complete_solutions = false;

let animation_timers = [];
let start_time = null;
let timer_interval = null;
let last_notice_time = 0;
/*
以下变量和常量用于算法。
 */
let module_collection;
let bitmap_size;
let safe_bitmap;
let mine_bitmap;
let constrained_bitmap;
let safe_bitmap_verifier;

const Nm_ = 0x0000FFFF;
const Xm_ = 0x00FF0000;
const Ym_ = 0xFF000000;
/*
以下变量用于记录单局内算法数据。
 */
let total_module_calculation_time;
let total_module_calculation_calls;
let total_csp_calculation_time;
let total_csp_calculation_calls;

let test_module_only_solved;
let test_csp_called;
let test_csp_found_solution;
let test_truly_unsolvable;

let test_total_components;
let test_components_processed;
let test_components_filtered_small;
let test_components_filtered_large;
let test_component_variables;
/*
以下变量定义了在键盘操作模式下的光标位置，键盘操作通过快捷键 shift + t 打开。
 */
let counter_covered, counter_marked;
let cursor_x, cursor_y;



// < PART 1 - CORE GAME MECHANICS >

// Todo 1.1 - Game Initialization & Setup
function start() {
    ID++;
    clear_all_animation_timers();

    if (current_test_id > 0) {
        const params = TEST_CONFIG[current_test_id];
        X = 8;
        Y = 8;
        N = 0;
        N_target = params.Mines.length;

        mines_inited = true;
        calculate_complete_solutions = true;
        init_board_data();

        for (const [x, y] of params.Mines) {
            set_mine(x * Y + y);
        }
        setTimeout(() => {
            select_cell(7);
            while (solvable) {
                solve();
            }
        }, 50);
    } else if (current_test_id === 0) {
        const params = get_difficulty_params();
        X = params.X;
        Y = params.Y;
        N = 0
        N_target = params.N_target;

        mines_inited = false;
        calculate_complete_solutions = true;
        init_board_data();
    } else {
        const params = get_difficulty_params(current_difficulty);
        X = params.X;
        Y = params.Y;
        N = 0
        N_target = params.N_target;

        calculate_complete_solutions = false;
        mines_inited = false;
        init_board_data();
    }

    first_click = true;
    game_over = false;
    is_solving = false;
    is_testing = false;
    solvable = false;
    counter_covered = X * Y;
    counter_marked = 0;

    bitmap_size = ((X * Y + 31) >> 5) + 1;
    safe_bitmap = new Uint32Array(bitmap_size);
    mine_bitmap = new Uint32Array(bitmap_size);
    constrained_bitmap = new Uint32Array(bitmap_size);
    safe_bitmap_verifier = new Uint32Array(bitmap_size);
    init_Module_and_CSP_algorithm();

    cursor_x = (X / 3) | 0;
    cursor_y = (Y / 3) | 0;
    cursor_element.style.transform = `translate3d(${cursor_y * CELL_SIZE}px, ${cursor_x * CELL_SIZE}px, 0)`;
    hint_element.classList.add('hidden');

    start_time = null;
    clearInterval(timer_interval);

    generate_game_field();
    render_border();
    init_information_box();
    update_solvability_info();
    update_mines_visibility();
    play_start_animation();
}
function init_board_data() {
    /*
    此函数的作用仅仅是初始化棋盘，但不添加雷，目的是在玩家选择第一个格子后再调用 init_mines() 函数确认雷的位置。
     */
    DATA = new Uint8Array(X * Y).fill(Cv_);
}
function init_mines(target_number_of_mines, position_first_click) {
    /*
    此函数的作用是随机摆放雷的位置，position_first_click 为输入的赦免坐标，确保雷不会摆放到此坐标及其相邻坐标。
     */
    const fx = (position_first_click / Y) | 0;
    const fy = position_first_click - fx * Y;

    let size = X * Y;
    const array = new Uint32Array(size);
    for (let i = 0; i < size; i++) {
        array[i] = i;
    }

    array[position_first_click] = --size;
    for (let n = 0; n < 8; n++) {
        const x = fx + DX[n];
        const y = fy + DY[n];
        if (x >= 0 && x < X && y >= 0 && y < Y) {
            array[x * Y + y] = --size;
        }
    }

    for (let i = 0; i < target_number_of_mines; i++) {
        const r = i + ((Math.random() * (size - i)) | 0);
        const temp = array[i];
        array[i] = array[r];
        array[r] = temp;
    }

    for (let i = 0; i < target_number_of_mines; i++) {
        const ri = array[i];
        set_mine(ri);
    }
}
function get_difficulty_params(difficulty) {
    switch (difficulty) {
        case 'low':
            return { X: 9, Y: 9, N_target: 10 };
        case 'medium':
            return { X: 16, Y: 16, N_target: 40 };
        case 'high':
            return { X: 16, Y: 30, N_target: 99 };
        case 'fullscreen':
            const x = Math.min(((window.innerHeight - 100) / (CELL_SIZE + 2)) | 0, 80);
            const y = Math.min(((window.innerWidth - 20) / (CELL_SIZE + 2)) | 0, 160);
            const n_target = ( x * y * 0.20625) | 0;
            return { X: x, Y: y, N_target: n_target };
        default:
            return { X: 16, Y: 30, N_target: 99 };
    }
}
function set_mine(index) {
    if (DATA[index] & Mi_) {
        return;
    }
    DATA[index] |= Mi_;
    N++;
    update_cell_information_from_data(index);
    const idx = (index / Y) | 0;
    const idy = index - idx * Y;
    for (let n = 0; n < 8; n++) {
        const x = idx + DX[n];
        const y = idy + DY[n];
        if (x >= 0 && x < X && y >= 0 && y < Y) {
            const i = x * Y + y;
            DATA[i]++;
            update_cell_information_from_data(i);
        }
    }
}
function remove_mine(index) {
    if (!(DATA[index] & Mi_)) {
        return;
    }
    DATA[index] &= ~Mi_;
    N--;
    update_cell_information_from_data(index);
    const idx = (index / Y) | 0;
    const idy = index - idx * Y;
    for (let n = 0; n < 8; n++) {
        const x = idx + DX[n];
        const y = idy + DY[n];
        if (x >= 0 && x < X && y >= 0 && y < Y) {
            const i = x * Y + y;
            DATA[i]--;
            update_cell_information_from_data(i);
        }
    }
}
// Todo 1.2 - Game State Transition Management
function select_cell(i) {
    /*
    此函数用于玩家层面选择坐标。
     */
    if (game_over) {
        return;
    }
    if (!(DATA[i] & Cv_)) {
        return;
    }
    const target_element = CELL_ELEMENTS[i];
    if (target_element.classList.contains('marked')) {
        target_element.classList.remove('marked');
        counter_marked--;
        return;
    }

    if (!mines_inited) {
        init_mines(N_target, i);
        update_mines_visibility();
        mines_inited = true;
    }
    if (first_click) {
        start_timer();
        document.getElementById('status-info').textContent = 'In Progress';
        first_click = false;
    }
    if (!solvable && (DATA[i] & Mi_)) {
        reset_mines(i);
    }

    const reveal_sequence = calculate_reveal_sequence([i]);
    admin_reveal_cells(reveal_sequence, ID);
}
function calculate_reveal_sequence(input_queue) {
    const visited = new Set();
    for (const i of input_queue) {
        visited.add(i);
    }

    let index = 0;
    while (index < input_queue.length) {
        const j = input_queue[index];
        index++;

        if (DATA[j] & Mi_) {
            continue;
        }
        if (DATA[j] & Nr_) {
            continue;
        }
        const jx = (j / Y) | 0;
        const jy = j - jx * Y;
        for (let n = 0; n < 8; n++) {
            const x = jx + DX[n];
            const y = jy + DY[n];
            if (x >= 0 && x < X && y >= 0 && y < Y) {
                const k = x * Y + y;
                if (!visited.has(k)) {
                    input_queue.push(k);
                    visited.add(k);
                }
            }
        }
    }
    return input_queue;
}
function admin_reveal_cells(reveal_sequence, current_id) {
    /*
    所有打开坐标的行为均通过此函数实现，算法也统一在此处更新，每次局面变化都需要及时更新可解性（solvability）信息。
     */
    if (game_over) {
        return;
    }
    if (current_id !== ID) {
        return;
    }
    for (const i of reveal_sequence) {
        if (DATA[i] & Cv_) {
            DATA[i] &= ~Cv_;
            counter_covered--;
            remove_cell_from_safe_bitmap(i);

            if (DATA[i] & Mi_) {
                terminate(false);
            } else if (counter_covered === N) {
                terminate(true);
            }
        }
    }

    if (!game_over) {
        for (const i of reveal_sequence) {
            if (DATA[i] & Nr_) {
                init_module(i);
            }
        }
        remove_opened_cells_from_module_collection(reveal_sequence);
        calculate_solution();
    }

    update_solvability_info();
    play_reveal_cells_animation(reveal_sequence, ID);
}
function flag_cell(i) {
    if (game_over || !(DATA[i] & Cv_)) {
        return;
    }
    const target_element = CELL_ELEMENTS[i];
    if (target_element.classList.contains('marked')) {
        target_element.classList.remove('marked');
        counter_marked--;
    } else {
        target_element.classList.add('marked');
        counter_marked++;
    }
}
function terminate(completed) {
    game_over = true;
    clearInterval(timer_interval);
    if (completed) {
        document.getElementById('status-info').textContent = 'Completed';
        send_notice('congrats');
    } else {
        document.getElementById('status-info').textContent = 'Failed';
        send_notice('failed');
    }
    log_algorithm_performance();
}
// Todo 1.3 - Administrator Function
function toggle_mines_visibility() {
    mines_visible = !mines_visible;
    update_mines_visibility();
    update_ans_button_selection();
}
function notice_test() {
    /*
    此函数的作用是测试发送消息的功能是否正常，运行后会将各类别消息各发送一次。
     */
    let time_out = 0;
    Object.keys(NOTICE_CONFIG).forEach(type => {
        setTimeout(() => {
            send_notice(type, false);
        }, time_out);
        time_out += 500;
    });
    setTimeout(() => {
        send_test_result_notice("1024 0024<br>");
    }, time_out)
}
async function solver_test(total_games = 50, delay = 100, delay_step = 10) {
    const results = {
        total_games,

        module_only_solved: 0,
        csp_called: 0,
        csp_found_solution: 0,
        truly_unsolvable: 0,

        total_module_time: 0,
        total_csp_time: 0,
        total_module_calls: 0,
        total_csp_calls: 0,

        total_components: 0,
        total_components_processed: 0,
        total_components_filtered_small: 0,
        total_components_filtered_large: 0,
        total_component_variables: 0,
    };

    test_module_only_solved = 0;
    test_csp_called = 0;
    test_csp_found_solution = 0;
    test_truly_unsolvable = 0;

    test_total_components = 0;
    test_components_processed = 0;
    test_components_filtered_small = 0;
    test_components_filtered_large = 0;
    test_component_variables = 0;

    for (let g = 0; g < total_games; g++) {
        start();
        await new Promise(resolve => setTimeout(resolve, delay));

        while (!game_over) {
            solve();
            await new Promise(resolve => setTimeout(resolve, delay_step));
        }

        results.total_module_time += total_module_calculation_time;
        results.total_csp_time += total_csp_calculation_time;
        results.total_module_calls += total_module_calculation_calls;
        results.total_csp_calls += total_csp_calculation_calls;
    }

    results.module_only_solved += test_module_only_solved;
    results.csp_called += test_csp_called;
    results.csp_found_solution += test_csp_found_solution;
    results.truly_unsolvable += test_truly_unsolvable;

    results.total_components += test_total_components;
    results.total_components_processed += test_components_processed;
    results.total_components_filtered_small += test_components_filtered_small;
    results.total_components_filtered_large += test_components_filtered_large;
    results.total_component_variables += test_component_variables;

    const avg = x => (x / total_games).toFixed(2);
    const pct = (x, y) => y === 0 ? 'N/A' : (x / y * 100).toFixed(1) + '%';

    console.warn(`
===== Solver Test Results (${total_games} games) =====

[求解统计 - 每局平均]
求解算法调用次数：${avg(results.total_module_calls)}
CSP调用次数：${avg(results.total_csp_calls)}
模块算法直接解决局面：${avg(results.module_only_solved)}
CSP找到新解的局面：${avg(results.csp_found_solution)}
真正无解的局面：${avg(results.truly_unsolvable)}

[时间统计 - 每局平均]
模块算法总耗时：${avg(results.total_module_time)}ms
CSP总耗时：${avg(results.total_csp_time)}ms
模块算法单次耗时：${(results.total_module_time / results.total_module_calls).toFixed(3)}ms
CSP单次耗时：${results.total_csp_calls === 0 ? 'N/A' : (results.total_csp_time / results.total_csp_calls).toFixed(3)}ms

[分区统计 - 每次CSP调用平均]
连通分量总数：${results.total_csp_calls === 0 ? 'N/A' : (results.total_components / results.total_csp_calls).toFixed(2)}
被处理的分量数：${results.total_csp_calls === 0 ? 'N/A' : (results.total_components_processed / results.total_csp_calls).toFixed(2)}
被过滤小分量数：${results.total_csp_calls === 0 ? 'N/A' : (results.total_components_filtered_small / results.total_csp_calls).toFixed(2)}
被过滤大分量数：${results.total_csp_calls === 0 ? 'N/A' : (results.total_components_filtered_large / results.total_csp_calls).toFixed(2)}
被处理分量平均变量数：${results.total_components_processed === 0 ? 'N/A' : (results.total_component_variables / results.total_components_processed).toFixed(2)}
小分量过滤率：${pct(results.total_components_filtered_small, results.total_components)}
大分量过滤率：${pct(results.total_components_filtered_large, results.total_components)}
==============================================
    `);
}
// Todo 1.4 - Test Mode
function test() {
    cursor_element.classList.add('hidden');

    set_background();
    send_notice('test_start');
    solving_test();
}
function exit_test() {
    current_test_id = null;
    mines_visible = false;

    update_ans_button_selection();
    close_solving_test_ui();
    close_reset_test_ui();
    update_sidebar_buttons();
    send_notice('test_end');
    start();
}
// Todo 1.5 - Solving Algorithm Completeness Test
function solving_test() {
    current_test_id = 0;
    mines_visible = false;

    update_ans_button_selection();
    close_reset_test_ui();
    generate_solving_test_ui();
    update_sidebar_buttons();
    start();
}
async function calculate_and_visualize_safe_cells() {
    /*
    此函数的作用是，使用一个额外的求解算法来验证此游戏搭载的复合求解算法的完备性，运行此函数可以调用验证算法对
    当前局面求解，然后将此解与模块算法给出的解进行比对，并将比对结果显示在页面上。
     */
    if (game_over) return;
    for (let i = 0; i < X * Y; i++) {
        CELL_ELEMENTS[i].classList.remove('safe-mdl', 'safe-verifier', 'safe-both');
    }

    await calculate_safe_cells_of_verifier();

    let result_consistent= true;
    for (let i = 1; i < bitmap_size; i++) {
        const bits = safe_bitmap[i];
        const bits_verifier = safe_bitmap_verifier[i];

        if (!bits && !bits_verifier) {
            continue;
        } else if (bits !== bits_verifier) {
            result_consistent = false;
        }

        for (let bit_position = 0; bit_position < 32; bit_position++) {
            const index = (i - 1) * 32 + bit_position;
            const cell_element = CELL_ELEMENTS[index];

            const is_safe_in_mdl = bits & (1 << bit_position);
            const is_safe_in_verifier = bits_verifier & (1 << bit_position);

            if (is_safe_in_mdl && is_safe_in_verifier) {
                cell_element.classList.add('safe-both');
            } else if (is_safe_in_mdl) {
                cell_element.classList.add('safe-mdl');
            } else if (is_safe_in_verifier) {
                cell_element.classList.add('safe-verifier');
            }
        }
    }

    if (!result_consistent) {
        send_test_result_notice(
            'Result of MDL-Algorithm and Verifier are inconsistent. Screenshot captured automatically.<br>'
        );
        await screenshot_data();
    }
}
async function continue_solving_test() {
    if (game_over) return;
    if (!first_click) {
        for (let i = 1; i < bitmap_size; i++) {
            const bits = safe_bitmap[i]
            const bits_verifier = safe_bitmap_verifier[i];
            if (bits !== bits_verifier) {
                send_notice('progression_blocked');
                return false;
            }
        }
    }

    if (first_click || !solvable) {
        const random_selection = extract_random_safe_cell();
        select_cell(random_selection);
    } else {
        const selections = extract_indices_from_bitmap(safe_bitmap);
        const reveal_sequence = calculate_reveal_sequence(selections);
        admin_reveal_cells(reveal_sequence, ID);
    }

    await new Promise(resolve => setTimeout(resolve, 50 + REVEAL_DELAY_LIMIT));
    await calculate_and_visualize_safe_cells();

    return true;
}
async function complete_full_solving_test() {
    if (game_over) {
        return;
    }
    if (is_testing) {
        is_testing = false;
        return;
    }
    document.getElementById('complete-test-btn').classList.add('selected');
    is_testing = true;
    let completeness = true;
    while (!game_over && is_testing && completeness) {
        completeness = await continue_solving_test();
        if (!game_over && is_testing && completeness) {
            await new Promise(resolve => setTimeout(resolve, AUTO_SOLVING_TEST_INTERVAL));
        }
    }
    document.getElementById('complete-test-btn').classList.remove('selected');
    is_testing = false;
}
// Todo 1.6 - Reset Algorithm Validation Test
function reset_test() {
    current_test_id = 1;
    mines_visible = false;

    update_ans_button_selection();
    close_solving_test_ui();
    generate_reset_test_ui();
    update_reset_test_selection();
    update_sidebar_buttons();
    start();
}
function select_test(target_test_id) {
    current_test_id = target_test_id;
    start();
    update_reset_test_selection();
    update_ans_button_selection();
}
function select_previous_reset_test() {
    if (current_test_id === 0) return;
    const previous_test_id = current_test_id > 1 ? current_test_id - 1 : TEST_SIZE;
    select_test(previous_test_id);
}
function select_next_reset_test() {
    if (current_test_id === 0) return;
    const next_test_id = current_test_id < TEST_SIZE ? current_test_id + 1 : 1;
    select_test(next_test_id);
}



// < PART 2 - ALGORITHM >

// Todo 2.1 - Bitmap Analyse
function mark_bitmap_as_safe(target_bitmap) {
    const indices = extract_indices_from_bitmap(target_bitmap);
    for (const i of indices) {
        DATA[i] |= Is_;
    }
    for (let i = 0; i < module_collection.length; i++) {
        const module_i = module_collection[i];
        if (module_i) {
            for (let array_position = 1; array_position < bitmap_size; array_position++) {
                module_i[array_position] &= ~target_bitmap[array_position];
            }
            module_collection[i] = module_i;
        }
    }
    for (let index = 1; index < bitmap_size; index++) {
        safe_bitmap[index] |= target_bitmap[index];
        constrained_bitmap[index] &= ~target_bitmap[index];
    }
}
function mark_bitmap_as_mine(target_bitmap) {
    const indices = extract_indices_from_bitmap(target_bitmap);
    for (const i of indices) {
        DATA[i] |= Im_;
    }
    for (let i = 0; i < module_collection.length; i++) {
        const module_i = module_collection[i];
        if (module_i) {
            const table = BIT_COUNT_TABLE;
            let count = 0;
            for (let array_position = 1; array_position < bitmap_size; array_position++) {
                const word = module_i[array_position] & target_bitmap[array_position];
                count += table[word & 0xFF] + table[(word >>> 8) & 0xFF] + table[(word >>> 16) & 0xFF] + table[word >>> 24];

                module_i[array_position] &= ~target_bitmap[array_position];
            }
            module_i[0] -= count;
            module_collection[i] = module_i;
        }
    }
    for (let index = 1; index < bitmap_size; index++) {
        mine_bitmap[index] |= target_bitmap[index];
        constrained_bitmap[index] &= ~target_bitmap[index];
    }
}
function mark_cell_as_safe(target_cell) {
    DATA[target_cell] |= Is_;
    const array_position = target_cell >> 5;
    const bit_position = target_cell & 31;
    for (let i = 0; i < module_collection.length; i++) {
        const module_i = module_collection[i];
        if (module_i) {
            module_i[array_position + 1] &= ~(1 << bit_position);
            module_collection[i] = module_i;
        }
    }
    safe_bitmap[array_position + 1] |= (1 << bit_position);
    constrained_bitmap[array_position + 1] &= ~(1 << bit_position);
}
function remove_cell_from_safe_bitmap(target_cell) {
    const array_position = target_cell >> 5;
    const bit_position = target_cell - array_position * 32;
    safe_bitmap[array_position + 1] &= ~(1 << bit_position);
}
function extract_indices_from_bitmap(target_bitmap) {
    const indices = [];
    for (let array_position = 1; array_position < bitmap_size; array_position++) {
        let bits = target_bitmap[array_position];
        let bit_position = 0;
        while (bits) {
            if (bits & 1) {
                const index = (array_position - 1) * 32 + bit_position;
                indices.push(index);
            }
            bits >>>= 1;
            bit_position++;
        }
    }
    return indices;
}
function count_bits(bitmap) {
    let count = 0;
    const table = BIT_COUNT_TABLE;
    for (let i = 1; i < bitmap_size; i++) {
        const word = bitmap[i];
        count += table[word & 0xFF] +
            table[(word >>> 8) & 0xFF] +
            table[(word >>> 16) & 0xFF] +
            table[word >>> 24];
    }
    return count;
}
function count_bits_word(word) {
    const table = BIT_COUNT_TABLE;
    return table[word & 0xFF] +
        table[(word >>> 8) & 0xFF] +
        table[(word >>> 16) & 0xFF] +
        table[word >>> 24];
}
// Todo 2.2 - Module Analyse
/*
模块（module）是我自己命名的一个扫雷游戏的概念，以下是大致介绍：
一个模块由两个核心信息组成，分别是模块中的雷数（n）和模块包含的未打开的坐标（covered_positions），它表示在所有模块包含的坐标中有且仅有 n 个雷。
在代码实现层面，使用一个 Uint32Array 存储上述信息信息。Array 的第 0 位用于存储模块的雷数，从第 1 位开始以位图的结构存储模块中的坐标。
由于每一个模块最初都是由一个数字生成，模块坐标围绕在中心数字周围，因此可对 Uint32Array 中原本存储模块雷数的第 0 位进行进一步拆解，以它的
低 16 位存储模块雷数，高 16 位存储模块的中心坐标（x 和 y 各占 8 位），它的作用是在模块之间两两比对运算时，尽早检索并跳过绝不可能相交的模块。
此架构的优势主要在于，在分析的过程中总是使用位运算，并且可以批量处理数据。许多操作的时间复杂度为 O(1)，空间消耗几乎为 0。
为了让模块与此项目中的其它位图（不包含压缩位图）无障碍接轨，其它位图均被设计为从第 1 位开始存储位图信息（不使用第 0 位）。
 */
function init_module(center_index) {
    const module = new Uint32Array(bitmap_size);
    const x = (center_index / Y) | 0;
    const y = center_index - x * Y;
    let count = 0;
    let module_n_value = DATA[center_index] & Nr_;

    for (let n = 0; n < 8; n++) {
        const ix = x + DX[n];
        const iy = y + DY[n];
        if (ix >= 0 && ix < X && iy >= 0 && iy < Y) {
            const i = ix * Y + iy;
            if (!(DATA[i] & Cv_)) {
                continue;
            }
            if (DATA[i] & Is_) {
                continue;
            }
            if (DATA[i] & Im_) {
                module_n_value--;
                continue;
            }
            count++;
            module[(i >> 5) + 1] |= 1 << (i & 31);
        }
    }

    if (module_n_value === 0) {
        mark_bitmap_as_safe(module);
    } else if (module_n_value === count) {
        mark_bitmap_as_mine(module);
    } else {
        module[0] = module_n_value | (x << 16) | (y << 24);
        module_collection.push(module);
        for (let i = 1; i < bitmap_size; i++) {
            constrained_bitmap[i] |= module[i];
        }
    }
}
function process_module_pair(i, j) {
    /*
    此函数会分析两个输入模块的关系，并尝试从当前的两个模块中推导出新模块。
    在代码实现方面，第一运算会产生 1 个新模块，而第二运算会产生 3 个新模块，通过将确定模块的信息存入 DATA 后删除模块，
    可以实现输入任意 2 个模块都只输出至多 2 个模块，进而实现原地模块运算，使模块集的规模受到严格限制。
     */
    const module_i = module_collection[i];
    const module_j = module_collection[j];
    module_collection[i] = null;
    module_collection[j] = null;

    let i_empty = true;
    let j_empty = true;
    let i_subset_j = true;
    let j_subset_i = true;
    let equals = true;
    let intersect = false;

    for (let i = 1; i < bitmap_size; i++) {
        const data_i = module_i[i];
        const data_j = module_j[i];

        if (data_i) {
            i_empty = false;
        }
        if (data_j) {
            j_empty = false;
        }
        if (data_i !== data_j) {
            equals = false;
        }
        if (data_i & data_j) {
            intersect = true;
        }
        if (data_i & ~data_j) {
            i_subset_j = false;
        }
        if (data_j & ~data_i) {
            j_subset_i = false;
        }
    }

    if (i_empty || j_empty) {
        if (!i_empty) {
            module_collection[i] = module_i;
        }
        if (!j_empty) {
            module_collection[j] = module_j;
        }
        return false;
    }
    if (equals) {
        module_collection[i] = module_i;
        return false;
    }
    if (!intersect) {
        module_collection[i] = module_i;
        module_collection[j] = module_j;
        return false;
    }

    // Real-Subset
    const i_0 = module_i[0], j_0 = module_j[0];
    if (i_subset_j) {
        const module_k = new Uint32Array(bitmap_size);
        module_k[0] = j_0 - (i_0 & Nm_);
        for (let i = 1; i < bitmap_size; i++) {
            module_k[i] = module_j[i] & ~module_i[i];
        }
        module_collection[i] = module_i;
        module_collection[j] = module_k;
        return true;
    }
    if (j_subset_i) {
        const module_k = new Uint32Array(bitmap_size);
        module_k[0] = i_0 - (j_0 & Nm_);
        for (let i = 1; i < bitmap_size; i++) {
            module_k[i] = module_i[i] & ~module_j[i];
        }
        module_collection[j] = module_j;
        module_collection[i] = module_k;
        return true;
    }

    // Real-Intersect
    const intersection = new Uint32Array(bitmap_size);
    const diff_ij = new Uint32Array(bitmap_size);
    const diff_ji = new Uint32Array(bitmap_size);
    let count_diff_ij = 0;
    let count_diff_ji = 0;

    const table = BIT_COUNT_TABLE;
    for (let i = 1; i < bitmap_size; i++) {
        const data_i = module_i[i];
        const data_j = module_j[i];
        const i_j = data_i & ~data_j;
        const j_i = data_j & ~data_i;
        intersection[i] = data_i & data_j;
        diff_ij[i] = i_j;
        diff_ji[i] = j_i;

        count_diff_ij += table[i_j & 0xFF] + table[(i_j >>> 8) & 0xFF] + table[(i_j >>> 16) & 0xFF] + table[i_j >>> 24];
        count_diff_ji += table[j_i & 0xFF] + table[(j_i >>> 8) & 0xFF] + table[(j_i >>> 16) & 0xFF] + table[j_i >>> 24];
    }

    const diff_ij_n = (i_0 & Nm_) - (j_0 & Nm_);
    if (diff_ij_n === count_diff_ij) {
        mark_bitmap_as_safe(diff_ji);
        mark_bitmap_as_mine(diff_ij);

        const module_k = intersection;
        module_k[0] = j_0;
        module_collection[i] = module_k;
        return true;
    }
    if (-diff_ij_n === count_diff_ji) {
        mark_bitmap_as_safe(diff_ij);
        mark_bitmap_as_mine(diff_ji);

        const module_k = intersection;
        module_k[0] = i_0;
        module_collection[i] = module_k;
        return true;
    }

    module_collection[i] = module_i;
    module_collection[j] = module_j;
    return false;
}
// Todo 2.3 - Module-based Solving Algorithm
function init_Module_and_CSP_algorithm() {
    module_collection = [];

    total_module_calculation_time = 0;
    total_module_calculation_calls = 0;
    total_csp_calculation_time = 0;
    total_csp_calculation_calls = 0;
}
function calculate_complete_module_collection() {
    const start_time = performance.now()

    let generated_informative_module = true;
    while (generated_informative_module) {
        generated_informative_module = false;
        for (let i = module_collection.length - 1; i > 0; i--) {
            for (let j = i - 1; j >= 0; j--) {
                const module_i = module_collection[i];
                const module_j = module_collection[j];
                if (!module_i) {
                    break;
                }
                if (!module_j) {
                    continue;
                }
                const diff_ij_x = ((module_i[0] & Xm_) - (module_j[0] & Xm_)) >> 16;
                const diff_ij_y = ((module_i[0] & Ym_) - (module_j[0] & Ym_)) >> 24;
                if (diff_ij_x < -2 || diff_ij_x > 2 || diff_ij_y < -2 || diff_ij_y > 2) {
                    continue;
                }
                generated_informative_module |= process_module_pair(i, j);
            }
        }
        generated_informative_module |= filter_decidable_modules();
        filter_null_modules();
    }
    console.log(`Module Collection Size: ${module_collection.length}`);

    const end_time = performance.now();
    const duration = end_time - start_time;
    total_module_calculation_time += duration;
    total_module_calculation_calls++;
}
function filter_null_modules() {
    let write = 0;
    for (let read = 0; read < module_collection.length; read++) {
        if (module_collection[read] !== null) {
            if (read !== write) {
                module_collection[write] = module_collection[read];
            }
            write++;
        }
    }
    module_collection.length = write;
}
function filter_decidable_modules() {
    let module_decided = false;
    for (let i = 0; i < module_collection.length; i++) {
        const module = module_collection[i];
        if (module) {
            if ((module[0] & Nm_) === 0) {
                module_collection[i] = null;
                mark_bitmap_as_safe(module);
                module_decided = true;
            } else if ((module[0] & Nm_) === count_bits(module)) {
                module_collection[i] = null;
                mark_bitmap_as_mine(module);
                module_decided = true;
            }
        }
    }
    return module_decided;
}
function remove_opened_cells_from_module_collection(list) {
    const opened_bitmap = new Uint32Array(bitmap_size);
    for (const i of list) {
        opened_bitmap[(i >> 5) + 1] |= 1 << (i & 31);
    }
    for (let i = 0; i < module_collection.length; i++) {
        const module_i = module_collection[i];
        if (module_i) {
            for (let array_position = 1; array_position < bitmap_size; array_position++) {
                module_i[array_position] &= ~opened_bitmap[array_position];
            }
            module_collection[i] = module_i;
        }
    }
}
// Todo 2.4 - CSP-based Solving Algorithm
function calculate_csp_solution() {
    const start_time = performance.now();

    let safe_indices = [];
    let text_00 = 'CSP Solution:';

    const {module_candidates_family, module_n_values_family, local_to_global_family, counts} = compress_module_collection();
    const number_of_connected_components = module_candidates_family.length;

    for (let i = 0; i < number_of_connected_components; i++) {
        let module_candidates = module_candidates_family[i];
        let module_n_values = module_n_values_family[i];
        let local_to_global = local_to_global_family[i];
        let count = counts[i];
        const component_safe_indices = calculate_component_csp_solution(module_candidates, module_n_values, local_to_global, count);
        test_component_variables += count;
        test_components_processed++;

        for (const idx of component_safe_indices) {
            safe_indices.push(idx);
            const ix = (idx / Y) | 0;
            const iy = idx - ix * Y;
            text_00 += `[${ix},${iy}]`;
        }
    }

    const end_time = performance.now();
    const duration = end_time - start_time;
    total_csp_calculation_time += duration;
    total_csp_calculation_calls++;

    if (safe_indices.length > 0) {
        console.warn(text_00);
    }
    return safe_indices;
}
function calculate_component_csp_solution(module_candidates_collection, module_n_values, local_to_global, count) {
    const safe_indices = [];

    let candidates_queue = (count === 32) ? 0xFFFFFFFF : (1 << count) - 1;

    const standard_remaining_upper_bound = new Uint8Array(module_candidates_collection.length);
    for (let i = 0; i < module_candidates_collection.length; i++) {
        standard_remaining_upper_bound[i] = count_bits_word(module_candidates_collection[i]);
    }

    while (candidates_queue) {
        const lowest_bit = candidates_queue & -candidates_queue;
        const forced_index = Math.clz32(lowest_bit) ^ 31;

        const current_sum = new Uint8Array(module_candidates_collection.length);
        const remaining_upper_bound = new Uint8Array(standard_remaining_upper_bound);

        for (let i = 0; i < module_candidates_collection.length; i++) {
            if (module_candidates_collection[i] & (1 << forced_index)) {
                current_sum[i]++;
                remaining_upper_bound[i]--;
            }
        }

        const solution = find_solution_with_constraint(forced_index, 0, count, module_candidates_collection, module_n_values,
            current_sum, remaining_upper_bound);
        if (solution !== null) {
            candidates_queue &= ~solution;
            candidates_queue &= ~lowest_bit;
        } else {
            candidates_queue &= ~lowest_bit;
            safe_indices.push(local_to_global[forced_index]);
        }
    }

    return safe_indices;
}
function compress_module_collection(filter_small_components = true) {
    const component_map = analyse_connected_components();

    const module_candidates_family = [];
    const module_n_values_family = [];
    const local_to_global_family = [];
    const counts = [];

    for (const [root, module_indices] of component_map) {
        test_total_components++;

        const size = module_indices.length;
        if (size <= 2 && filter_small_components) {
            test_components_filtered_small++;
            continue;
        }

        const component_bitmap = new Uint32Array(bitmap_size);
        for (const module_index of module_indices) {
            for (let i = 1; i < bitmap_size; i++) {
                component_bitmap[i] |= module_collection[module_index][i];
            }
        }

        const count = count_bits(component_bitmap);
        if (count > CSP_ALGORITHM_LIMIT) {
            test_components_filtered_large++;
            console.warn('CSP Algorithm Limit Exceeded: ' + count);
            continue;
        }

        const global_to_local = new Map();
        const local_to_global = [];
        let local_index = 0;
        for (let array_position = 1; array_position < bitmap_size; array_position++) {
            let word = component_bitmap[array_position];
            while (word) {
                const lowest_bit = word & -word;
                const bit_position = Math.clz32(lowest_bit) ^ 31;
                const global_index = (array_position - 1) * 32 + bit_position;
                global_to_local.set(global_index, local_index);
                local_to_global.push(global_index);
                local_index++;
                word &= word - 1;
            }
        }

        const module_candidates = new Uint32Array(size);
        const module_n_values = new Uint8Array(size);
        for (let i = 0; i < size; i++) {
            const module_i = module_collection[module_indices[i]];
            module_n_values[i] = module_i[0] & Nm_;
            for (let array_position = 1; array_position < bitmap_size; array_position++) {
                let word = module_i[array_position];
                while (word) {
                    const lowest_bit = word & -word;
                    const bit_position = Math.clz32(lowest_bit) ^ 31;
                    const global_index = (array_position - 1) * 32 + bit_position;
                    const local_index = global_to_local.get(global_index);
                    module_candidates[i] |= (1 << local_index);
                    word &= word - 1;
                }
            }
        }

        module_candidates_family.push(module_candidates);
        module_n_values_family.push(module_n_values);
        local_to_global_family.push(local_to_global);
        counts.push(count);
    }
    console.warn(`Number of Connected Components: ${module_candidates_family.length}`);
    return {module_candidates_family, module_n_values_family, local_to_global_family, counts};
}
function analyse_connected_components() {
    const mdc_size = module_collection.length;
    const parent = new Int32Array(mdc_size);
    const rank = new Uint8Array(mdc_size);
    for (let i = 0; i < mdc_size; i++) {
        parent[i] = i;
    }

    function find(x_1) {
        while (parent[x_1] !== x_1) {
            parent[x_1] = parent[parent[x_1]];
            x_1 = parent[x_1];
        }
        return x_1;
    }
    function union(x_1, x_2) {
        const rx_1 = find(x_1), rx_2 = find(x_2);
        if (rx_1 === rx_2) {
            return;
        }
        if (rank[rx_1] < rank[rx_2]) {
            parent[rx_1] = rx_2;
        } else if (rank[rx_1] > rank[rx_2]) {
            parent[rx_2] = rx_1;
        } else {
            parent[rx_2] = rx_1;
            rank[rx_1]++;
        }
    }

    for (let i = 0; i < mdc_size; i++) {
        for (let j = i + 1; j < mdc_size; j++) {
            for (let k = 1; k < bitmap_size; k++) {
                if (module_collection[i][k] & module_collection[j][k]) {
                    union(i, j);
                    break;
                }
            }
        }
    }

    const component_map = new Map();
    for (let i = 0; i < mdc_size; i++) {
        const root = find(i);
        if (!component_map.has(root)) {
            component_map.set(root, []);
        }
        component_map.get(root).push(i);
    }
    return component_map;
}
function find_solution_with_constraint(forced_index, current_depth, max_depth, module_candidates_collection, module_n_values,
                                       current_sum, remaining_upper_bound) {
    if (current_depth === max_depth) {
        return 0;
    }
    if (current_depth === forced_index) {
        return find_solution_with_constraint(forced_index, current_depth + 1, max_depth, module_candidates_collection, module_n_values,
            current_sum, remaining_upper_bound);
    }
    const bit = 1 << current_depth;
    for (let i = 0; i < module_candidates_collection.length; i++) {
        if (module_candidates_collection[i] & bit) {
            remaining_upper_bound[i]--;
        }
    }

    if (is_feasible(current_sum, remaining_upper_bound, module_candidates_collection, module_n_values)) {
        const result = find_solution_with_constraint(forced_index, current_depth + 1, max_depth, module_candidates_collection, module_n_values,
            current_sum, remaining_upper_bound);
        if (result !== null) {
            return result;
        }
    }

    for (let i = 0; i < module_candidates_collection.length; i++) {
        if (module_candidates_collection[i] & bit) {
            current_sum[i]++;
        }
    }
    if (is_feasible(current_sum, remaining_upper_bound, module_candidates_collection, module_n_values)) {
        const result = find_solution_with_constraint(forced_index, current_depth + 1, max_depth,
            module_candidates_collection, module_n_values, current_sum, remaining_upper_bound);
        if (result !== null) {
            return result | bit;
        }
    }

    for (let i = 0; i < module_candidates_collection.length; i++) {
        if (module_candidates_collection[i] & bit) {
            current_sum[i]--;
            remaining_upper_bound[i]++;
        }
    }
    return null;
}
function is_feasible(current_sum, remaining_upper_bound, module_candidates_collection, module_n_values) {
    for (let i = 0; i < module_candidates_collection.length; i++) {
        if (current_sum[i] > module_n_values[i]) {
            return false;
        }
        if (current_sum[i] + remaining_upper_bound[i] < module_n_values[i]) {
            return false;
        }
    }
    return true;
}
// Todo 2.5 - Module- and CSP-based Complete Solving Algorithm
function calculate_solution() {
    calculate_complete_module_collection();
    check_solvability();
    if (solvable) {
        test_module_only_solved++;
        return;
    }
    if (module_collection.length <= 2) {
        return;
    }
    const safe_candidates_by_CSP = calculate_csp_solution();
    test_csp_called++;
    if (safe_candidates_by_CSP.length > 0) {
        test_csp_found_solution++;
        for (const safe_candidate of safe_candidates_by_CSP) {
            mark_cell_as_safe(safe_candidate);
        }
        calculate_complete_module_collection();
        check_solvability();
    } else {
         test_truly_unsolvable++;
    }
}
function check_solvability() {
    solvable = false;
    for (let i = 1; i < safe_bitmap.length; i++) {
        if (safe_bitmap[i]) {
            solvable = true;
            break;
        }
    }
}
function extract_random_safe_cell() {
    if (first_click) {
        return (Math.random() * X * Y) | 0;
    }
    const selections = [];
    for (let i = 0; i < X * Y; i++) {
        if (!(DATA[i] & Mi_) && (DATA[i] & Cv_)) {
            selections.push(i);
        }
    }
    const ri = (Math.random() * selections.length) | 0;
    return selections[ri];
}
function solve() {
    if (game_over) {
        return;
    }

    if (first_click || !solvable) {
        const random_selection = extract_random_safe_cell();
        select_cell(random_selection);
        return;
    }

    const selections = extract_indices_from_bitmap(safe_bitmap);
    const queue = calculate_reveal_sequence(selections);
    admin_reveal_cells(queue, ID);
}
async function solve_all(delay = AUTO_SOLVE_INTERVAL) {
    if (game_over) {
        return;
    }
    if (is_solving) {
        is_solving = false;
        return;
    }
    document.getElementById('solve-all-btn').classList.add('selected');
    is_solving = true;
    while (!game_over && is_solving) {
        solve();
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    document.getElementById('solve-all-btn').classList.remove('selected');
    is_solving = false;
}
function send_hint() {
    if (game_over) {
        return;
    }

    let hint_index;
    if (first_click || !solvable) {
        hint_index = extract_random_safe_cell();
    } else {
        const safe_indices = extract_indices_from_bitmap(safe_bitmap);
        const random_index = (Math.random() * safe_indices.length) | 0;
        hint_index = safe_indices[random_index];
    }
    const hint_x = (hint_index / Y) | 0;
    const hint_y = hint_index - hint_x * Y;

    hint_element.classList.remove('hidden');
    hint_element.style.transform = `translate3d(${hint_y * CELL_SIZE}px, ${hint_x * CELL_SIZE}px, 0)`;
    setTimeout(() => {
        hint_element.classList.add('hidden');
    }, 2000);
}
function mark_mines() {
    if (game_over) {
        return;
    }
    const indices = extract_indices_from_bitmap(mine_bitmap);
    for (const i of indices) {
        const target_element = CELL_ELEMENTS[i];
        if (!target_element.classList.contains('marked')) {
            target_element.classList.add('marked');
            counter_marked++;
        }
    }
}
// Todo 2.6 - CSP-based Reset Algorithm
function reset_mines(target_mine) {
    /*
    此函数用于在无解局面下，当玩家选择一个逻辑上不一定是雷但实际是雷的坐标，则将此处的雷移走并确保所有可见数字无变化。
     */
    let test_result_text = '';
    let removed_list = '';
    let added_list = '';

    const text_00 = 'Reset Algorithm Activated.';
    console.warn(text_00);
    test_result_text += text_00 + '<br>';

    if (DATA[target_mine] & Im_) {
        const text_01 = 'Clicked a cell that is definitely a mine.'
        test_result_text += text_01 + '<br>';
        console.warn(text_01);
        send_test_result_notice(test_result_text);
        return false;
    }

    const constrained_candidates_array = extract_indices_from_bitmap(constrained_bitmap);
    const forced_index = constrained_candidates_array.indexOf(target_mine);

    // 1. Phase - Reset
    if (forced_index === -1) {
        // 1. Type - Unconstrained in Module Collection
        remove_mine(target_mine);
        const tx = (target_mine / Y) | 0;
        const ty = target_mine - tx * Y;
        removed_list += `[${tx},${ty}] `;
    } else {
        // 2. Type - Constrained in Module Collection
        const {module_candidates_family, module_n_values_family, local_to_global_family, counts} = compress_module_collection(false);

        let target_component = -1;
        let target_forced_index = -1;
        for (let c = 0; c < local_to_global_family.length; c++) {
            const local_to_global = local_to_global_family[c];
            for (let k = 0; k < local_to_global.length; k++) {
                if (local_to_global[k] === target_mine) {
                    target_component = c;
                    target_forced_index = k;
                    break;
                }
            }
            if (target_component !== -1) {
                break;
            }
        }

        if (target_component === -1) {
            const text_01 = 'Reset failed: component size exceeded CSP limit.';
            test_result_text += text_01 + '<br>';
            console.warn(text_01);
            send_notice('reset_failed', false);
            send_test_result_notice(test_result_text);
            return false;
        }

        const module_candidates = module_candidates_family[target_component];
        const module_n_values = module_n_values_family[target_component];
        const local_to_global = local_to_global_family[target_component];
        const count = counts[target_component];

        const current_sum = new Uint8Array(module_candidates.length);
        const remaining_upper_bound = new Uint8Array(module_candidates.length);
        for (let i = 0; i < module_candidates.length; i++) {
            remaining_upper_bound[i] = count_bits_word(module_candidates[i]);
            if (module_candidates[i] & (1 << target_forced_index)) {
                remaining_upper_bound[i]--;
            }
        }

        const solution = find_solution_with_constraint(target_forced_index, 0, count, module_candidates, module_n_values,
            current_sum, remaining_upper_bound);
        if (solution === null) {
            const text_02 = 'Reset failed: no solution found.';
            test_result_text += text_02 + '<br>';
            console.warn(text_02);
            send_notice('reset_failed', false);
            send_test_result_notice(test_result_text);
            return false;
        }

        for (let k = 0; k < count; k++) {
            const global_index = local_to_global[k];
            const is_mine_in_solution = (solution >> k) & 1;
            const is_mine_in_data = (DATA[global_index] & Mi_) ? 1 : 0;
            const ix = (global_index / Y) | 0;
            const iy = global_index - ix * Y;
            if (is_mine_in_solution && !is_mine_in_data) {
                set_mine(global_index);
                added_list += `[${ix},${iy}] `;
            } else if (!is_mine_in_solution && is_mine_in_data) {
                remove_mine(global_index);
                removed_list += `[${ix},${iy}] `;
            }
        }
    }

    // 2. Phase - Balance Number of Mines
    if (N < N_target) {
        let add_mines_count = N_target - N;
        let unconstrained_and_safe_candidates_array = [];
        for (let i = 0; i < X * Y; i++) {
            if (i === target_mine) {
                continue;
            }
            if ((DATA[i] & Mi_) || !(DATA[i] & Cv_)) {
                continue;
            }
            let is_constrained = false;
            const ix = (i / Y) | 0;
            const iy = i - ix * Y;
            for (let n = 0; n < 8; n++) {
                const idx = ix + DX[n];
                const idy = iy + DY[n];
                if (idx >= 0 && idx < X && idy >= 0 && idy < Y) {
                    const index = idx * Y + idy;
                    if (!(DATA[index] & Cv_)) {
                        is_constrained = true;
                        break;
                    }
                }
            }
            if (!is_constrained) {
                unconstrained_and_safe_candidates_array.push(i);
            }
        }
        const size = unconstrained_and_safe_candidates_array.length;
        if (size > add_mines_count) {
            for (let i = 0; i < add_mines_count; i++) {
                const r = i + ((Math.random() * (size - i)) | 0);
                const temp = unconstrained_and_safe_candidates_array[i];
                unconstrained_and_safe_candidates_array[i] = unconstrained_and_safe_candidates_array[r];
                unconstrained_and_safe_candidates_array[r] = temp;
            }
            unconstrained_and_safe_candidates_array.length = add_mines_count;
        }
        for (let index = 0; index < unconstrained_and_safe_candidates_array.length; index++) {
            const added_mine = unconstrained_and_safe_candidates_array[index];
            const mx = (added_mine / Y) | 0;
            const my = added_mine - mx * Y;
            set_mine(added_mine);
            added_list += `[${mx},${my}] `;
        }
    } else if (N > N_target) {
        let remove_mines_count = N - N_target;
        let unconstrained_and_mine_candidates_array = [];
        for (let i = 0; i < X * Y; i++) {
            if (!(DATA[i] & Mi_) || !(DATA[i] & Cv_)) {
                continue;
            }
            let is_constrained = false;
            const ix = (i / Y) | 0;
            const iy = i - ix * Y;
            for (let n = 0; n < 8; n++) {
                const idx = ix + DX[n];
                const idy = iy + DY[n];
                if (idx >= 0 && idx < X && idy >= 0 && idy < Y) {
                    const index = idx * Y + idy;
                    if (!(DATA[index] & Cv_)) {
                        is_constrained = true;
                        break;
                    }
                }
            }
            if (!is_constrained) {
                unconstrained_and_mine_candidates_array.push(i);
            }
        }
        const size = unconstrained_and_mine_candidates_array.length;
        if (size > remove_mines_count) {
            for (let i = 0; i < remove_mines_count; i++) {
                const r = i + ((Math.random() * (size - i)) | 0);
                const temp = unconstrained_and_mine_candidates_array[i];
                unconstrained_and_mine_candidates_array[i] = unconstrained_and_mine_candidates_array[r];
                unconstrained_and_mine_candidates_array[r] = temp;
            }
            unconstrained_and_mine_candidates_array.length = remove_mines_count;
        }
        for (let index = 0; index < unconstrained_and_mine_candidates_array.length; index++) {
            const removed_mine = unconstrained_and_mine_candidates_array[index];
            const mx = (removed_mine / Y) | 0;
            const my = removed_mine - mx * Y;
            remove_mine(removed_mine);
            removed_list += `[${mx},${my}] `;
        }
    }

    // 3. Phase - Print Result
    const text_03 = `Removed Mines: <br>${removed_list}`;
    console.warn(text_03);
    test_result_text += text_03 + '<br>';

    const text_04 = `Added Mines: <br>${added_list}`;
    console.warn(text_04);
    test_result_text += text_04 + '<br>';

    const text_end = 'Reset complete.';
    console.warn(text_end);
    test_result_text += text_end + '<br>';

    update_mines_visibility();
    send_notice('reset_complete', false);
    send_test_result_notice(test_result_text);
    return true;
}
// Todo 2.7 - Verifier
async function calculate_safe_cells_of_verifier() {
    /*
    可在此函数中根据当前局面使用外来代码求解，请将解存入位图 safe_bitmap_verifier，并删除下方代码，此函数不需要返回值。
     */
    safe_bitmap_verifier = new Uint32Array(safe_bitmap);
}



