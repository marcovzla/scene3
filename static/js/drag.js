var _startX = 0;            // mouse starting positions
var _startY = 0;

var _dragElements = []; // so we don't have to iterate through wordsSelectedMask every time the mouse moves
var _dragElementsOffsets = [];

var _responses = [];
var _wordsSelectedMask = [];

var _currentResponseIndex = -1;

var _sequence = 0;
var _scene = 0;

var _selectionRect = false;
var _selectionRectTop = -1;
var _selectionRectLeft = -1;

UNSELECTED_BORDER = "2px solid black";
SELECTED_BORDER   = "2px solid yellow";
UNBOUND_BACKGROUND = "rgb(240, 240, 240)";
//SELECTION_RECT = "rgb(240, 240, 240)"
//SELECTION_RECT = "#FF0000";
SELECTION_RECT = "yellow";

enable_user_input();

/*
function Word(text, base_offset, div, binding) {
    this.text = text;
    this.base_offset = base_offset;
    this.div = div;
    this.binding = binding;
}
*/

function enable_user_input()
{
    document.onmousedown = OnMouseDown;
    document.onmouseup = OnMouseUp;
    document.onkeyup = OnKeyUp;
}


function disable_user_input()
{
    document.onmousedown = null;
    document.onmouseup = null;
    document.onkeyup = null;
}

function OnKeyUp(e)
{
    console.log(e);
    if (e.keyCode == 46) // delete
    {
        assign_selected(-1);
        unselect_all_words();
        update_div_colors();
    }
    else if (e.keyCode >= 48 && e.keyCode <= 57) // number
    {
        var numeral = e.keyCode - 48;
        if (room.objects.length > numeral) {
            assign_selected(numeral);
        }
        unselect_all_words();
        update_div_colors();
    }
    else if (e.keyCode == 79) // 'o', for last object
    {
        if (room.objects.length > 0) {
            assign_selected(room.objects.length - 1);
        }
        unselect_all_words();
        update_div_colors();
    } else if (e.keyCode == 27 && _dragElements)
    {
        // repos drag elements
        for (var i = 0; i < _dragElements.length; i++) {
            $(_dragElements[i]).offset(_dragElementsOffsets[i]);
        };

        // clear drag arrays
        _dragElements = [];
        _dragElementsOffsets = [];
    }
    return true;
}

function assign_selected(assignment_index) {
    /*set object_binding for selected words to assignment_index, if assignment_index >= 0
    if assignment_index = -1, will clear object_binding for selected words*/
    var word_list = _responses[_currentResponseIndex].word_list;
    for (var i = 0; i < word_list.length; i++) 
    {
        if (_wordsSelectedMask[i])
        {
            if (assignment_index > -1) 
                word_list[i].object_binding = assignment_index;
            else
                delete word_list[i].object_binding
        };
    };
}

function OnMouseDown(e)
{
    // IE doesn't pass the event object
    if (e == null) 
        e = window.event; 
    
    // IE uses srcElement, others use target
    var target = e.target != null ? e.target : e.srcElement;

    var word_list = _responses[_currentResponseIndex].word_list;

    // for IE, left click == 1
    // for Firefox, left click == 0
    if (e.shiftKey) 
    {
        // toggle selection status of target
        var target_index = 0;
        for (; target_index < word_list.length; target_index++) {
            //console.log("" + target_index + " " + target + " " + _words[target_index].div);
            if (target == _responses[_currentResponseIndex].word_list[target_index].div) {
                break;
            }
        }
        if (target_index >= word_list.length) {
            console.log("target " + target + " not found in _words");
            return false;
        } 
        if (_wordsSelectedMask[target_index]) { // selected
            _wordsSelectedMask[target_index] = false;
            $(word_list[target_index].div).css("border", UNSELECTED_BORDER);
            
        } else { // not selected
            _wordsSelectedMask[target_index] = true;
            $(word_list[target_index].div).css("border", SELECTED_BORDER);
        }
    } else if ((e.button == 1 && window.event != null || 
        e.button == 0) && 
        target.className == 'drag')
    {
        // build the array of dragElements
        for (var i = 0; i < word_list.length; i++) {
            if (_wordsSelectedMask[i])
            {
                _dragElements.push(word_list[i].div);
                //console.log($(_words[i].div).offset());
                _dragElementsOffsets.push(word_list[i].offset);
            }
        }
        // grab the mouse position
        _startX = e.pageX;
        _startY = e.pageY;

        // bring the clicked element to the front while it is being dragged
        //_oldZIndex = target.style.zIndex;
        //target.style.zIndex = 10000;
        
        // we need to access the element in OnMouseMove
        //_dragElement = target;
    } else { // selection rect
        _selectionRect = true;
        _selectionRectTop = e.pageY;
        _selectionRectLeft = e.pageX;
    }

    // tell our code to start moving the element with the mouse
    document.onmousemove = OnMouseMove;

    // cancel out any text selections
    document.body.focus();

    // prevent text selection in IE
    document.onselectstart = function () { return false; };
    // prevent IE from trying to drag an image
    target.ondragstart = function() { return false; };

    // prevent text selection (except IE)
    return false;
}

function OnMouseMove(e)
{
    if (e == null) 
        var e = window.event; 

    if (_selectionRect)
    {
        var c=$("#canvas");
        var ctx=c[0].getContext("2d");
        var top1 = _selectionRectTop - c.offset().top;
        var left1 = _selectionRectLeft - c.offset().left;
        var top2 = e.pageY - c.offset().top;
        var left2 = e.pageX - c.offset().left;
        ctx.fillStyle = SELECTION_RECT;
        ctx.clearRect(0,
                      0,
                      c.width(),
                      c.height());
        ctx.fillRect(Math.min(left1, left2),
                     Math.min(top1, top2),
                     Math.abs(left1 - left2),
                     Math.abs(top1 - top2));
    }
    for (var i = 0; i < _dragElements.length; i++) {
        var init_offset = _dragElementsOffsets[i];
        var new_pos = {};
        new_pos.left = init_offset.left + e.pageX - _startX;
        new_pos.top = init_offset.top + e.pageY - _startY;
        $(_dragElements[i]).offset(new_pos);
    };
}

function show_dialog(str)
{
    var object_data = $('#object_data').dialog({
        autoOpen: false,
        close: function () {
            $(this).html('');
        }
    });
    object_data.html(str);
    object_data.dialog('open');
}

function OnMouseUp(e)
{
    if (_selectionRect) {
        console.log("here");
        _selectionRect = false;
        if (e.pageX != _selectionRectLeft && e.pageY != _selectionRectTop) {
            select_divs_within_rect(e.pageX, e.pageY, 
                                    _selectionRectLeft, _selectionRectTop);
        }
        var c=$("#canvas");
        var ctx=c[0].getContext("2d");
        var top1 = _selectionRectTop - c.offset().top;
        var left1 = _selectionRectLeft - c.offset().left;
        var top2 = e.pageY - c.offset().top;
        var left2 = e.pageX - c.offset().left;
        ctx.fillStyle = SELECTION_RECT;
        ctx.clearRect(0,
                      0,
                      c.width(),
                      c.height());
    }
    if (_dragElements.length > 0)
    {
        //_dragElement.style.zIndex = _oldZIndex;
        var viewport = document.getElementById("viewport");
        var offset_x = viewport.offsetLeft;
        var offset_y = viewport.offsetTop;
        var lst = room.objectAt(e.pageX - offset_x, e.pageY - offset_y);

        var word_list = _responses[_currentResponseIndex].word_list;
        if (lst != undefined && lst[0] != undefined) {
            var idx = lst[0];
            var shape = lst[1];
            var color = lst[2];
            // assign object_bindings
            assign_selected(idx);
        } else 
        {
            // clear bindings
            assign_selected(-1);
        }
        // repos drag elements
        for (var i = 0; i < _dragElements.length; i++) {
            // stupid hack, what is going on with offset?
            //for (var j = 0; j < 4; j++) {
            $(_dragElements[i]).offset(_dragElementsOffsets[i]);
            //};
        };

        // do colors
        update_div_colors();

        // clear drag arrays
        _dragElements = [];
        _dragElementsOffsets = [];

        // unselect words
        unselect_all_words();
        // we're done with these events until the next OnMouseDown
        document.onmousemove = null;
        document.onselectstart = null;
    }
}

function unselect_all_words() {
    var word_list = _responses[_currentResponseIndex].word_list;
    for (var i = 0; i < _wordsSelectedMask.length; i++) {
        if (_wordsSelectedMask[i])
        {
            $(word_list[i].div).css("border", UNSELECTED_BORDER);
            _wordsSelectedMask[i] = false;
        };
    };
}

function ExtractNumber(value)
{
    var n = parseInt(value);
	
    return n == null || isNaN(n) ? 0 : n;
}

function clear_words()
{
    // clear divs
    $(".drag").remove();
    $('#response_display').text("");

    // clear arrays
    _wordsSelectedMask = [];

    _dragElements = []; 
    _dragElementsOffsets = [];
}

function save_responses()
{
    lean_responses = $.extend(true, [], _responses);
    for (var i = 0; i < lean_responses.length; i++) {
        word_list = lean_responses[i].word_list;
        for (var j = 0; j < word_list.length; j++) {
            delete word_list[j].div
            delete word_list[j].offset
        };
    };
    $.post('/saveresponses', {
        sequence: _sequence,
        scene: _scene,
        response_data: JSON.stringify(lean_responses, null, 4)
    });
}

function load_responses(sequence, scene, responses_json)
{
    _sequence = sequence;
    _scene = scene;
    _responses = responses_json;
    load_response_index(0);
}

function load_response_index(i)
{
    if (_responses.length > i) 
    {
        _currentResponseIndex = i;
        var response = _responses[i];
        clear_words();
        $('#response_display').text(response.string);

        var word_list = response.word_list;
        for (var i = 0; i < word_list.length; i++){ 
            //console.log(sub_strings[i]);
            var newDivs = $('<div class="drag">' + word_list[i].word + "</div>"); // there will only be one created
            $("#word_box").append(newDivs);
            word_list[i].offset = newDivs.offset();
            word_list[i].div = newDivs[0];
            _wordsSelectedMask.push(false);
        } 

        update_div_colors();

        $("#count_remaining").text("response " + (_currentResponseIndex + 1) + " of " + _responses.length);
    }
    update_movement_buttons();
    resize_scene_to_window();
}

function update_movement_buttons()
{
    $("#next").attr('disabled', _currentResponseIndex >= _responses.length - 1)
    $("#previous").attr('disabled', _currentResponseIndex <= 0)
}

function next_response()
{
    load_response_index(_currentResponseIndex + 1)
}

function previous_response()
{
    load_response_index(_currentResponseIndex - 1)
}

function select_divs_within_rect(corner1x, corner1y, corner2x, corner2y)
{
    var x0 = Math.min(corner1x, corner2x);
    var x1 = Math.max(corner1x, corner2x);
    var y0 = Math.min(corner1y, corner2y);
    var y1 = Math.max(corner1y, corner2y);
    console.log("selecting within " + x0 + ", " + x1 + ", " + y0 + ", " + y1);

    word_list = _responses[_currentResponseIndex].word_list;
    for (var i = 0; i < word_list.length; i++) {
        var div = word_list[i].div;
        var left = $(div).position().left;
        var top = $(div).position().top;
        var right = $(div).width() + left;
        var bottom = $(div).height() + top;
        _wordsSelectedMask[i] = (left >= x0 && top >= y0 && right <= x1 && bottom <= x2);
        $(word_list[i].div).css("border", _wordsSelectedMask[i] ? SELECTED_BORDER : UNSELECTED_BORDER);
    };
}

function update_div_colors()
{
    word_list = _responses[_currentResponseIndex].word_list;
    for (var i = 0; i < word_list.length; i++) {
        var binding = word_list[i].object_binding;
        if (binding != undefined)
        {
            if (binding > room.objects.length) {
                console.log("invalid binding " + binding);
            } else {
                var color = room.objects[binding].settings.color;
                $(word_list[i].div).css("background-color", color);
            }
        }
        else // unbound
        {
            $(word_list[i].div).css("background-color", UNBOUND_BACKGROUND);
        }
    };
}

function draw() {  
    var canvas = document.getElementById("canvas");  
    var ctx = canvas.getContext("2d");  

    ctx.fillStyle = "rgb(200,0,0)";  
    ctx.fillRect (10, 10, 55, 50);  

    ctx.fillStyle = "rgba(0, 0, 200, 0.5)";  
    ctx.fillRect (30, 30, 55, 50);  
}  
