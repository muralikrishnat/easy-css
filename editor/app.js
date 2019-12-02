import "./less/global.less";

import * as ace from 'brace';
import 'brace/mode/markdown';
import 'brace/theme/github';



var editor = ace.edit("editor", {
    minLines: 200
});
editor.session.setMode("ace/mode/markdown");
editor.setTheme("ace/theme/github");

