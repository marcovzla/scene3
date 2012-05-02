var _startX = 0;            // mouse starting positions
var _startY = 0;

var _words = [];
var _wordsSelectedMask = [];

var _dragElements = []; // so we don't have to iterate through wordsSelectedMask every time the mouse moves
var _dragElementsOffsets = [];

UNSELECTED_BORDER = "1px solid black"
SELECTED_BORDER   = "1px solid yellow"

InitDragDrop();

function Word(text, base_offset, div) {
    this.text = text;
    this.base_offset = base_offset;
    this.div = div;

    this.binding = -1;
}

function InitDragDrop()
{
    document.onmousedown = OnMouseDown;
    document.onmouseup = OnMouseUp;
}

function OnMouseDown(e)
{
    // IE is retarded and doesn't pass the event object
    if (e == null) 
        e = window.event; 
    
    // IE uses srcElement, others use target
    var target = e.target != null ? e.target : e.srcElement;
    
    // for IE, left click == 1
    // for Firefox, left click == 0
    if (e.shiftKey) 
    {
        // toggle selection status of target
        var target_index = 0;
        for (; target_index < _words.length; target_index++) {
            console.log("" + target_index + " " + target + " " + _words[target_index].div);
            if (target == _words[target_index].div) {
                break;
            }
        }
        if (target_index >= _words.length) {
            console.log("target " + target + " not found in _words");
            return false;
        } 
        if (_wordsSelectedMask[target_index]) { // selected
            _wordsSelectedMask[target_index] = false;
            $(_words[target_index].div).css("border", UNSELECTED_BORDER);
            
        } else { // not selected
            _wordsSelectedMask[target_index] = true;
            $(_words[target_index].div).css("border", SELECTED_BORDER);
        }
    } else if ((e.button == 1 && window.event != null || 
        e.button == 0) && 
        target.className == 'drag')
    {
        // build the array of dragElements
        for (var i = 0; i < _words.length; i++) {
            if (_wordsSelectedMask[i])
            {
                _dragElements.push(_words[i].div);
                console.log($(_words[i].div).offset());
                _dragElementsOffsets.push($(_words[i].div).offset());
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
        if (lst != undefined && lst[0] != undefined) {
            var idx = lst[0];
            var shape = lst[1];
            var color = lst[2];
            for (var i = 0; i < _words.length; i++) {
                if (_wordsSelectedMask[i]) 
                {
                    //$(_words[i].div).hide();
                    // unselect element
                    _wordsSelectedMask[i] = false;
                    $(_words[i].div).css("background-color", color);
                    _words[i].binding = idx
                }
            };
        }
        // repos drag elements
        for (var i = 0; i < _dragElements.length; i++) {
            $(_dragElements[i]).offset(_dragElementsOffsets[i]);
            $(_dragElements[i]).css("border", UNSELECTED_BORDER);
        };
        // clear drag arrays
        _dragElements = [];
        _dragElementsOffsets = [];

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

function load_string(str)
{
    clear_words();
    sub_strings = str.match(/\w+/g);

    for (var i = 0; i < sub_strings.length; i++){ 
        console.log(sub_strings[i]);
        var newDivs = $('<div class="drag">' + sub_strings[i] + "</div>"); // there will only be one created
        $("#word_box").append(newDivs);
        var word = new Word(sub_strings[i], newDivs.offset(), newDivs[0]);
        _words.push(word);
        _wordsSelectedMask.push(false);
    } 
    console.log(_words);
}

function clear_words()
{
    // clear divs
    $(".drag").remove();

    // clear arrays
    _words = [];
    _wordsSelectedMask = [];

    _dragElements = []; 
    _dragElementsOffsets = [];
}
