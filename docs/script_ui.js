// < PART 3 - VISUALIZATION & INTERACTION >

// Todo 3.1 - Board Rending
function init_dom_references() {
    cursor_element = document.getElementById('cursor');
    hint_element = document.getElementById('hint');
    time_info_element = document.getElementById('time-info');
    solvability_info_element = document.getElementById('solvability-info');
}
function setup_event_delegation() {
    const board = document.getElementById("board");
    board.addEventListener('click', function(event) {
        if (event.target.classList.contains('cell')) {
            const index = parseInt(event.target.dataset.index);
            if (!isNaN(index)) {
                select_cell(index);
            }
        }
    });
    board.addEventListener('contextmenu', function(event) {
        event.preventDefault();
        if (event.target.classList.contains('cell')) {
            const index = parseInt(event.target.dataset.index);
            if (!isNaN(index)) {
                flag_cell(index);
            }
        }
    });
}
function generate_game_field() {
    CELL_ELEMENTS = new Array(X * Y);
    const board_element = document.getElementById("board");
    board_element.innerHTML = "";

    board_element.style.gridTemplateRows = `repeat(${X}, ${CELL_SIZE}px)`;
    board_element.style.gridTemplateColumns = `repeat(${Y}, ${CELL_SIZE}px)`;

    for (let i = 0; i < X * Y; i++) {
        const div = document.createElement("div");
        div.className = "cell";
        div.style.fontSize = `${FONT_SIZE}px`;
        div.dataset.index = i.toString();
        board_element.appendChild(div);
        CELL_ELEMENTS[i] = div;
    }
}
function render_border() {
    const BORDER_OFFSET = 2;
    const BORDER_OFFSET_OUTLINE = 6;

    const width = Y * CELL_SIZE;
    const height = X * CELL_SIZE;

    const border = document.getElementById('border');
    border.style.width = `${width + 2 * BORDER_OFFSET}px`;
    border.style.height = `${height + 2 * BORDER_OFFSET}px`;
    border.style.left = `${-BORDER_OFFSET}px`;
    border.style.top = `${-BORDER_OFFSET}px`;
    border.style.display = 'block';

    const border_outline = document.getElementById('border-outline');
    border_outline.style.width = `${width + 2 * BORDER_OFFSET_OUTLINE}px`;
    border_outline.style.height = `${height + 2 * BORDER_OFFSET_OUTLINE}px`;
    border_outline.style.left = `${-BORDER_OFFSET_OUTLINE}px`;
    border_outline.style.top = `${-BORDER_OFFSET_OUTLINE}px`;
    border_outline.style.display = 'block';
}
function update_cell_information_from_data(i) {
    const target_cell = DATA[i];
    if (target_cell & Cv_) {
        return;
    }
    const target_element = CELL_ELEMENTS[i];
    if (target_cell & Mi_) {
        target_element.textContent = ' ';
        target_element.classList.add('mine');
    } else {
        const number = (target_cell & Nr_);
        target_element.textContent = number > 0 ? number.toString() : ' ';
        target_element.classList.add('revealed');
    }
}
function update_mines_visibility() {
    if (mines_visible) {
        for (let i = 0; i < X * Y; i++) {
            if (DATA[i] & Mi_) {
                CELL_ELEMENTS[i].classList.add('ans');
            } else {
                CELL_ELEMENTS[i].classList.remove('ans');
            }
        }
    } else {
        for (let i = 0; i < X * Y; i++) {
            CELL_ELEMENTS[i].classList.remove('ans');
        }
    }
}
// Todo 3.2 - Animations
function play_reveal_cell_animation(i, current_id) {
    if (current_id !== ID) {
        return;
    }
    const target_element = CELL_ELEMENTS[i];
    target_element.classList.remove('safe-mdl', 'safe-verifier', 'safe-both');
    if (target_element.classList.contains('marked')) {
        target_element.classList.remove('marked');
        counter_marked--;
    }
    update_cell_information_from_data(i);
}
function play_reveal_cells_animation(queue, current_id) {
    if (X * Y > ANIMATION_LIMIT) {
        for (const i of queue) {
            const target_element = CELL_ELEMENTS[i];
            target_element.classList.remove('safe-mdl', 'safe-verifier', 'safe-both');
            if (target_element.classList.contains('marked')) {
                target_element.classList.remove('marked');
                counter_marked--;
            }
            update_cell_information_from_data(i);
        }
    }
    let delay = 0;
    let index = 0;
    while (delay < REVEAL_DELAY_LIMIT && index < queue.length) {
        const i = queue[index];
        setTimeout(() => {
            play_reveal_cell_animation(i, current_id);
        }, delay)
        delay += REVEAL_DELAY;
        index++;
    }
    if (index < queue.length) {
        setTimeout(() => {
            while (index < queue.length) {
                play_reveal_cell_animation(queue[index], current_id);
                index++;
            }
        }, delay)
    }
}
function play_start_animation(delay_limit = 1000) {
    if (X * Y > ANIMATION_LIMIT) {
        send_notice("animation_off");
        return;
    }
    animation_timers.length = 0;
    hide_all_cells();

    delay_limit = Math.min(delay_limit, Y * 16);
    let delay = delay_limit;
    let left_pivot = 0;
    let right_pivot = Y - 1;
    while (left_pivot <= right_pivot) {
        const current_left = left_pivot;
        const current_right = right_pivot;
        const current_delay = delay;

        const timer = setTimeout(() => {
            animate_double_columns(current_left, current_right);
        }, current_delay);
        animation_timers.push(timer);

        delay = (delay * 0.9 + 1) | 0;
        left_pivot++;
        right_pivot--;
    }

    const end_timer = setTimeout(() => {
        cleanup_animation();
        clear_all_animation_timers();
    }, delay_limit + 100);
    animation_timers.push(end_timer);
}
function animate_double_columns(left, right) {
    if (left === right) {
        for (let x = 0; x < X; x++) {
            const cell = CELL_ELEMENTS[x * Y + left];
            cell.classList.remove('hidden');
            cell.classList.add('animating');
        }
    } else {
        for (let x = 0; x < X; x++) {
            const cell_left = CELL_ELEMENTS[x * Y + left];
            const cell_right = CELL_ELEMENTS[x * Y + right];
            cell_left.classList.remove('hidden');
            cell_left.classList.add('animating');
            cell_right.classList.remove('hidden');
            cell_right.classList.add('animating');
        }
    }
}
function hide_all_cells() {
    for (let i = 0; i < X * Y; i++) {
        const cell_element = CELL_ELEMENTS[i];
        cell_element.classList.add('hidden');
    }
}
function clear_all_animation_timers() {
    animation_timers.forEach(timer => {
        clearTimeout(timer);
        clearInterval(timer);
    });
    animation_timers.length = 0;
}
function cleanup_animation() {
    for (let i = 0; i < X * Y; i++) {
        CELL_ELEMENTS[i].style.willChange = 'auto';
    }
}
// Todo 3.3 - Sidebar & Control Panel
function update_sidebar_buttons() {
    close_difficulty_menu();
    close_background_menu();

    const buttons_visibility = {
        'information-btn': true,
        'start-btn': true,
        'difficulty-btn': current_test_id === null,
        'background-btn': current_test_id === null,
        'mark-mines-btn': current_test_id === null,
        'hint-btn': current_test_id === null,
        'solve-btn': current_test_id === null,
        'solve-all-btn': current_test_id === null,
        'analyse-test-btn': current_test_id === 0,
        'continue-test-btn': current_test_id === 0,
        'complete-test-btn': current_test_id === 0,
        'screenshot-btn': true,
        'guide-btn': current_test_id === null,
        'answer-btn': current_test_id !== null,
        'solving-test-btn': current_test_id > 0,
        'reset-test-btn': current_test_id === 0,
        'exit-btn': current_test_id !== null
    }
    for (const btn_id of Object.keys(buttons_visibility)) {
        const btn = document.getElementById(btn_id);
        const parent_element = btn.parentNode;
        const display = buttons_visibility[btn_id];
        if (display) {
            parent_element.classList.remove('hidden');
        } else {
            parent_element.classList.add('hidden');
        }
    }
}
function toggle_sidebar() {
    close_difficulty_menu();
    close_background_menu();

    const sidebar = document.getElementById('sidebar');
    const open_button = document.getElementById('open-sidebar-button');
    if (sidebar.classList.contains('collapsed')) {
        sidebar.classList.remove('collapsed');
        open_button.style.opacity = '0';
    } else {
        sidebar.classList.add('collapsed');
        open_button.style.opacity = '1';
    }
}
function toggle_information() {
    const info_list = document.getElementById('information-list');
    if (info_list.classList.contains('hidden')) {
        info_list.classList.remove('hidden');
        document.getElementById('information-btn').classList.add('selected');
    } else {
        info_list.classList.add('hidden');
        document.getElementById('information-btn').classList.remove('selected');
    }
}
function toggle_difficulty_dropdown() {
    if (document.getElementById('difficulty-menu').classList.contains('hidden')) {
        open_difficulty_menu();
    } else {
        close_difficulty_menu();
    }
    close_background_menu();
}
function toggle_background_dropdown() {
    if (document.getElementById('background-menu').classList.contains('hidden')) {
        open_background_menu();
    } else {
        close_background_menu();
    }
    close_difficulty_menu();
}
function open_difficulty_menu() {
    document.getElementById('difficulty-menu').classList.remove('hidden');
    document.getElementById('difficulty-btn').classList.add('selected');
}
function open_background_menu() {
    document.getElementById('background-menu').classList.remove('hidden');
    document.getElementById('background-btn').classList.add('selected');
}
function close_difficulty_menu() {
    document.getElementById('difficulty-menu').classList.add('hidden');
    document.getElementById('difficulty-btn').classList.remove('selected');
}
function close_background_menu() {
    document.getElementById('background-menu').classList.add('hidden');
    document.getElementById('background-btn').classList.remove('selected');
}
function set_difficulty(difficulty) {
    current_difficulty = difficulty;
    start();
    close_difficulty_menu();
}
function set_background(filename = 'default.jpg', title_image = 'dark') {
    document.documentElement.style.setProperty('--background-url', `url("Background_Collection/${filename}")`);
    if (title_image === 'light') {
        document.getElementById("title-dark").style.display = `none`;
        document.getElementById("title-light").style.display = `block`;
    } else {
        document.getElementById("title-dark").style.display = `block`;
        document.getElementById("title-light").style.display = `none`;
    }
    close_background_menu();
}
function open_guide() {
    document.getElementById('guide-modal').style.display = 'block';
    document.getElementById('guide-btn').classList.add('selected');
}
function close_guide_with_button() {
    document.getElementById('guide-modal').style.display = 'none';
    document.getElementById('guide-btn').classList.remove('selected');
}
function close_guide(event) {
    const content = document.getElementById('guide-content');
    if (!content.contains(event.target)) {
        close_guide_with_button();
    }
}
// Todo 3.4 - Information Display & Notifications
function init_information_box() {
    document.getElementById("status-info").textContent = "Ready to start";
    document.getElementById("time-info").textContent = "---";
    document.getElementById('size-info').textContent = `${X} × ${Y}`;
}
function update_time_info() {
    const elapsed = (Date.now() - start_time) / 1000;
    time_info_element.textContent = `${elapsed.toFixed(1)} s`;
}
function update_solvability_info() {
    if (game_over) {
        solvability_info_element.textContent = '---';
        return;
    }
    check_solvability();
    solvability_info_element.textContent = solvable ? 'True' : 'False';
}
function send_notice(type = 'default', locked = true) {
    const now = Date.now();
    if (locked) {
        if (locked && now - last_notice_time < NOTICE_TIME_LIMIT) {
            return;
        }
        last_notice_time = now;
    }

    const { title, content, color } = NOTICE_CONFIG[type];

    const notice = document.createElement('div');
    const notice_title = document.createElement('div');
    const notice_content = document.createElement('div');
    const notice_progress = document.createElement('div');

    notice.classList.add('notice');
    notice_title.classList.add('notice-title');
    notice_content.classList.add('notice-content');
    notice_progress.classList.add('notice-progress');

    notice_title.innerHTML = title;
    notice_content.innerHTML = content;
    notice_progress.style.backgroundColor = color;
    notice_progress.style.animation = `progressShrink ${NOTICE_DISPLAY_TIME}ms linear forwards`;

    notice.appendChild(notice_title);
    notice.appendChild(notice_content);
    notice.appendChild(notice_progress);

    notice.onclick = () => {
        remove_notice(notice);
    };
    push_notice(notice);
    setTimeout(() => {
        remove_notice(notice);
    }, NOTICE_DISPLAY_TIME);
}
function send_test_result_notice(text) {
    if (current_test_id === null) {
        return;
    }
    const test_result_notice = document.createElement('div');
    const notice_title = document.createElement('div');
    const notice_content = document.createElement('div');

    test_result_notice.classList.add('notice', 'test-result');
    notice_title.classList.add('notice-title');
    notice_content.classList.add('notice-content');

    notice_title.innerHTML = "Test Result";
    notice_content.innerHTML = text + format_time(Date.now());
    test_result_notice.appendChild(notice_title);
    test_result_notice.appendChild(notice_content);

    test_result_notice.onclick = () => {
        remove_notice(test_result_notice)
    };
    push_notice(test_result_notice);
}
function push_notice(target_notice) {
    const empty_wrapper = document.createElement('div');
    empty_wrapper.classList.add('notice-wrapper-empty');

    const notice_wrapper = document.createElement('div');
    notice_wrapper.classList.add('notice-wrapper');
    notice_wrapper.appendChild(target_notice);

    const container = document.getElementById('notice-container');
    container.appendChild(empty_wrapper);
    setTimeout(() => {
        container.removeChild(empty_wrapper);
    }, 100);

    container.appendChild(notice_wrapper);
    const total_height = notice_wrapper.offsetHeight;
    setTimeout(() => {
        empty_wrapper.style.height = '0';

        notice_wrapper.style.height = total_height + 'px';
        notice_wrapper.style.paddingBottom = '0';

        target_notice.style.opacity = '1';
    }, 0);
}
function remove_notice(target_notice) {
    if (!target_notice) {
        return;
    }
    if (target_notice.classList.contains('removed')) {
        return;
    }
    target_notice.classList.add('removed')
    const wrapper = target_notice.parentNode;

    target_notice.style.opacity = '0';
    setTimeout(() => {
        wrapper.style.height = '0';
    }, 100);
    setTimeout(() => {
        wrapper.parentNode.removeChild(wrapper);
    }, 300);
}
function log_algorithm_performance() {
    console.log(`MDL-Algorithm total time: ${total_module_calculation_time.toFixed(1)}ms`);
    console.log(`MDL-Function calls: ${total_module_calculation_calls}`);
    if (total_module_calculation_calls > 0) {
        console.log(`MDL-Average per call: ${(total_module_calculation_time / total_module_calculation_calls).toFixed(1)}ms`);
    }

    console.log(`CSP-Algorithm total time: ${total_csp_calculation_time.toFixed(1)}ms`);
    console.log(`CSP-Function calls: ${total_csp_calculation_calls}`);
    if (total_csp_calculation_calls > 0) {
        console.log(`CSP-Average per call: ${(total_csp_calculation_time / total_csp_calculation_calls).toFixed(1)}ms`);
    }

    console.log(`Solving Algorithm total time: ${(total_module_calculation_time + total_csp_calculation_time).toFixed(1)}ms`);
}
// Todo 3.5 - Test Mode UI
function generate_solving_test_ui() {
    document.getElementById('main-test-container-a').classList.remove('hidden');
}
function close_solving_test_ui() {
    document.getElementById('main-test-container-a').classList.add('hidden');
}
function generate_reset_test_ui() {
    document.getElementById('main-test-container-b').classList.remove('hidden');

    for (let i = 0; i < 3; i++) {
        const test_options_list = document.getElementById(`test-options-${i + 1}`);
        if (test_options_list) {
            test_options_list.innerHTML = '';
        }
    }

    const tests_by_type = {};
    for (let key = 1; key <= TEST_SIZE; key++) {
        const test_type = TEST_CONFIG[key].Type;
        if (!tests_by_type[test_type]) {
            tests_by_type[test_type] = [];
        }
        tests_by_type[test_type].push(key);
    }

    Object.keys(tests_by_type).forEach(type => {
        const test_options_list = document.getElementById(`test-options-${type}`);
        if (test_options_list) {
            tests_by_type[type].forEach(test_id => {
                const test_option = document.createElement('div');
                test_option.classList.add('test-option');
                test_option.innerHTML = `${format_number(test_id)}`;
                test_option.onclick = () => {
                    select_test(test_id);
                };
                test_options_list.appendChild(test_option);
            });
        }
    });

    update_reset_test_selection();
}
function close_reset_test_ui() {
    document.getElementById('main-test-container-b').classList.add('hidden');
}
function update_reset_test_selection() {
    document.querySelectorAll('.test-option:not(.ctrl)').forEach(option => {
        const test_id = option.textContent.trim();
        if (test_id === format_number(current_test_id)) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
}
function update_ans_button_selection() {
    const answer_btn = document.getElementById('answer-btn');
    const ans_test_btn_a = document.getElementById('ans-test-btn-a');
    const ans_test_btn_b = document.getElementById('ans-test-btn-b');

    if (mines_visible) {
        answer_btn.classList.add('selected');
        ans_test_btn_a.classList.add('selected');
        ans_test_btn_b.classList.add('selected');
    } else {
        answer_btn.classList.remove('selected');
        ans_test_btn_a.classList.remove('selected');
        ans_test_btn_b.classList.remove('selected');
    }
}
// Todo 3.6 - Utilities & Tools
function start_timer() {
    start_time = Date.now();
    timer_interval = setInterval(update_time_info, 100);
    update_time_info();
}
function handle_keydown(event) {
    /*
    此函数是确定所有快捷键行为的唯一函数。
    我设计的光标（cursor）可以实现玩家用键盘操作游戏，具体相关操作请查看函数内容。
     */
    const key = event.key.toLowerCase();
    const shift_enabled = event.shiftKey;

    if (current_test_id !== null) {
        switch (key) {
            case 'r':
                start();
                return;
            case 'escape':
                exit_test();
                return;
            case ' ':
                toggle_mines_visibility();
                break;
            case 'arrowright':
            case 'arrowdown':
                select_next_reset_test();
                break;
            case 'arrowleft':
            case 'arrowup':
                select_previous_reset_test();
                break;
        }
        return;
    }

    switch (key) {
        case 'escape':
            close_guide_with_button();
            close_difficulty_menu();
            close_background_menu();
            return;
        case 'c':
            toggle_sidebar();
            return;
        case 'f':
            if (!shift_enabled) {
                return;
            }
            cursor_element.classList.toggle('hidden');
            return;
        case 'r':
            start();
            return;
        case 'h':
            send_hint();
            break;
        case 't':
            if (shift_enabled) { test(); }
            break;
        case '0':
            solve();
            break;
    }

    if (cursor_element.classList.contains('hidden')) {
        return;
    }
    const step = shift_enabled ? 4 : 1;
    switch (key) {
        case 'w':
        case 'arrowup':
            cursor_x = Math.max(0, cursor_x - step);
            cursor_element.style.transform = `translate3d(${cursor_y * CELL_SIZE}px, ${cursor_x * CELL_SIZE}px, 0)`;
            break;
        case 's':
        case 'arrowdown':
            cursor_x = Math.min(X - 1, cursor_x + step);
            cursor_element.style.transform = `translate3d(${cursor_y * CELL_SIZE}px, ${cursor_x * CELL_SIZE}px, 0)`;
            break;
        case 'a':
        case 'arrowleft':
            cursor_y = Math.max(0, cursor_y - step);
            cursor_element.style.transform = `translate3d(${cursor_y * CELL_SIZE}px, ${cursor_x * CELL_SIZE}px, 0)`;
            break;
        case 'd':
        case 'arrowright':
            cursor_y = Math.min(Y - 1, cursor_y + step);
            cursor_element.style.transform = `translate3d(${cursor_y * CELL_SIZE}px, ${cursor_x * CELL_SIZE}px, 0)`;
            break;
        case 'm':
            flag_cell(cursor_x * Y + cursor_y);
            break;
        case ' ':
            select_cell(cursor_x * Y + cursor_y);
            break;
    }
}
function format_number(n) {
    if (n === 0) {
        return ' ';
    }
    if (n >= 1 && n <= 9) {
        return n.toString();
    }
    if (n >= 10 && n <= 35) {
        return String.fromCharCode(65 + (n - 10));
    }
    return '?';
}
function format_time(timestamp, used_in_filename = false) {
    let date = new Date(timestamp);
    let Y_ = date.getFullYear();
    let M_ = String(date.getMonth() + 1).padStart(2, '0');
    let D_ = String(date.getDate()).padStart(2, '0');
    let h_ = String(date.getHours()).padStart(2, '0');
    let m_ = String(date.getMinutes()).padStart(2, '0');
    let s_ = String(date.getSeconds()).padStart(2, '0');
    if (used_in_filename) {
        return `${Y_}_${M_}_${D_}_${h_}_${m_}_${s_}`;
    } else {
        return `${h_}:${m_}:${s_} / ${Y_}.${M_}.${D_}`;
    }
}
function format_candidate(x, y) {
    if (x === 0 && y === 0) {
        return ' ';
    } else if (x === 0) {
        if (y > 0 && y <= 26) {
            return String.fromCharCode(64 + y);
        } else if (y > 26 && y <= 52) {
            return String.fromCharCode(70 + y);
        } else {
            return '?';
        }
    } else if (y === 0) {
        if (x > 0 && x < 10) {
            return ' ' + x.toString();
        } else if (x < 100) {
            return x.toString();
        } else {
            return ' ?';
        }
    } else {
        return ' ';
    }
}
function preload_backgrounds() {
    const path = 'Background_Collection/';
    const resources = [
        '01.jpg',
        '02.jpg',
        '03.jpg',
    ];
    setTimeout(() => {
        resources.forEach(resource => {
            new Image().src = path + resource;
            console.log(`Loaded Background ${resource}`);
        })
    }, 1000);
}
function copy_text_to_clipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            send_notice('copied');
        })
        .catch((err) => {
            const range = document.createRange();
            range.selectNode(document.querySelector("#guide-content p"));
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            document.execCommand('copy');
            window.getSelection().removeAllRanges();
            send_notice('copied');
        });
}
async function screenshot_data(candidate = true) {
    /*
    此函数的作用是对当前扫雷局面进行截图，并以当前时间命名图片后下载图片到默认文件夹。
    由于浏览器禁止截图操作，实现方法是根据当前局面的核心信息 DATA 绘制图片，可通过更改输入的布尔值选择是否绘制坐标轴。
    在绘制过程中各 RGB 颜色是由此项目中 RGBA_Color.java 计算的，更改 CSS 设计时需重新计算绘制颜色
     */
    await document.fonts.ready;

    const indent_a = 4;
    const indent_b = 8;
    const width = candidate ?
        (Y + 1) * CELL_SIZE + indent_b * 2 : Y * CELL_SIZE + indent_b * 2;
    const height =  candidate ?
        (X + 1) * CELL_SIZE + indent_b * 2 : X * CELL_SIZE + indent_b * 2;
    let start_x = indent_b;
    let start_y = indent_b;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${FONT_SIZE}px Tahoma, 'Microsoft Sans Serif', Arial, sans-serif`;

    ctx.fillStyle = "rgba(255, 255, 255, 1)"
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (candidate) {
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.font = `bold ${FONT_SIZE}px Tahoma, 'Microsoft Sans Serif', Arial, sans-serif`;
        for (let x = 0; x < X + 1; x++) {
            const text = format_candidate(x, 0);
            const x_ = start_y - indent_a + CELL_SIZE / 2;
            const y_ = start_x + CELL_SIZE * x + CELL_SIZE / 2 + 1;
            ctx.fillText(text, x_, y_);
        }
        start_y += CELL_SIZE;
        for (let y = 0; y < Y; y++) {
            const text = format_candidate(0, y + 1);
            const x_ = start_y + CELL_SIZE * y + CELL_SIZE / 2;
            const y_ = start_x + CELL_SIZE / 2 + 1;
            ctx.fillText(text, x_, y_);
        }
        start_x += CELL_SIZE;
    }

    for (let x = 0; x < X; x++) {
        for (let y = 0; y < Y; y++) {
            const cell_element = CELL_ELEMENTS[x * Y + y];
            const px = start_x + CELL_SIZE * x;
            const py = start_y + CELL_SIZE * y;

            if (cell_element.classList.contains('ans')) {
                ctx.fillStyle = 'rgba(140, 18, 18, 1)';
                ctx.strokeStyle = 'rgba(157, 99, 99, 1)';
            } else if (cell_element.classList.contains('revealed')) {
                ctx.fillStyle = 'rgba(128, 128, 128, 1)';
                ctx.strokeStyle = 'rgba(166, 166, 166, 1)';
            } else if (cell_element.classList.contains('safe-both')) {
                ctx.fillStyle = 'rgba(255, 220, 120, 1)';
                ctx.strokeStyle = 'rgba(255, 231, 161, 1)';
            } else if (cell_element.classList.contains('safe-mdl')) {
                ctx.fillStyle = 'rgba(240, 160, 80, 1)';
                ctx.strokeStyle = 'rgba(245, 189, 133, 1)';
            }  else if (cell_element.classList.contains('safe-verifier')) {
                ctx.fillStyle = 'rgba(234, 88, 12, 1)';
                ctx.strokeStyle = 'rgba(240, 138, 85, 1)';
            } else {
                ctx.fillStyle = 'rgba(25, 25, 25, 1)';
                ctx.strokeStyle = 'rgba(94, 94, 94, 1)';
            }

            ctx.fillRect(py, px, CELL_SIZE, CELL_SIZE);
            ctx.lineWidth = 1;
            ctx.strokeRect(py + 0.5, px + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);

            const text = cell_element.textContent ? cell_element.textContent.toString() : " ";
            const x_ = py + CELL_SIZE / 2;
            const y_ = px + CELL_SIZE / 2 + 1;
            ctx.fillStyle = "rgba(255, 255, 255, 1)";
            ctx.fillText(text, x_, y_);
        }
    }

    canvas.toBlob(blob => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `minesweeper_${format_time(Date.now(), true)}.png`;
        link.click();
    });

    send_notice('screenshot');
}



// < PART 4 - APPLICATION INITIALIZATION >

// Todo 4.1 - Application Startup Sequence
document.addEventListener('keydown', handle_keydown);
setup_event_delegation();
preload_backgrounds();
update_sidebar_buttons();
init_dom_references();
start();