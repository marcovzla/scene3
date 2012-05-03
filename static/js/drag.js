var _startX = 0;            // mouse starting positions
var _startY = 0;

var _dragElements = []; // so we don't have to iterate through wordsSelectedMask every time the mouse moves
var _dragElementsOffsets = [];

var _responses = [];
var _wordsSelectedMask = [];

var _currentResponseIndex = -1;

var _sequence = 0;
var _scene = 0;

UNSELECTED_BORDER = "1px solid black";
SELECTED_BORDER   = "1px solid yellow";
UNBOUND_BACKGROUND = "rgb(240, 240, 240)";

InitDragDrop();

/*
function Word(text, base_offset, div, binding) {
    this.text = text;
    this.base_offset = base_offset;
    this.div = div;
    this.binding = binding;
}
*/

function InitDragDrop()
{
    document.onmousedown = OnMouseDown;
    document.onmouseup = OnMouseUp;
}


function DisableDragDrop()
{
    document.onmousedown = null;
    document.onmouseup = null;
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
                _dragElementsOffsets.push($(word_list[i].div).offset());
            }
        }
        // grab the mouse position
        _startX = e.clientX;
        _startY = e.clientY;

        // bring the clicked element to the front while it is being dragged
        //_oldZIndex = target.style.zIndex;
        //target.style.zIndex = 10000;
        
        // we need to access the element in OnMouseMove
        //_dragElement = target;
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

    for (var i = 0; i < _dragElements.length; i++) {
        var init_offset = _dragElementsOffsets[i];
        var new_pos = {};
        new_pos.left = init_offset.left + e.clientX - _startX;
        new_pos.top = init_offset.top + e.clientY - _startY;
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
    if (_dragElements.length > 0)
    {
        //_dragElement.style.zIndex = _oldZIndex;
        var viewport = document.getElementById("viewport");
        var offset_x = viewport.offsetLeft;
        var offset_y = viewport.offsetTop;
        var lst = room.objectAt(e.clientX - offset_x, e.clientY - offset_y);

        var word_list = _responses[_currentResponseIndex].word_list;
        if (lst != undefined && lst[0] != undefined) {
            var idx = lst[0];
            var shape = lst[1];
            var color = lst[2];
            for (var i = 0; i < word_list.length; i++) {
                if (_wordsSelectedMask[i]) 
                {
                    //$(_words[i].div).hide();
                    word_list[i].object_binding = idx
                }
            };
        } else {
            /*
            for (var i = 0; i < word_list.length; i++) {
                if (_wordsSelectedMask[i]) 
                {
                    delete word_list.object_binding
                }
            };
            */
        }
        // repos drag elements
        for (var i = 0; i < _dragElements.length; i++) {
            $(_dragElements[i]).offset(_dragElementsOffsets[i]);
            $(_dragElements[i]).css("border", UNSELECTED_BORDER);
        };

        // do colors
        update_div_colors();

        // clear drag arrays
        _dragElements = [];
        _dragElementsOffsets = [];

        // unselect words
        for (var i = 0; i < _wordsSelectedMask.length; i++) {
            _wordsSelectedMask[i] = false;
        };
        // we're done with these events until the next OnMouseDown
        document.onmousemove = null;
        document.onselectstart = null;
    }
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
            word_list[i].offset = newDivs.offset();
            word_list[i].div = newDivs[0];
            $("#word_box").append(newDivs);
            _wordsSelectedMask.push(false);
        } 

        update_div_colors();

        $("#count_remaining").text("response " + (_currentResponseIndex + 1) + " of " + _responses.length);
    }
    update_movement_buttons();
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
