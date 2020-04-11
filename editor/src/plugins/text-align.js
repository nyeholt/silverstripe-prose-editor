
var prosemirrorMenu = require('prosemirror-menu');

// var prosemirrorState = require('prosemirror-state');

function applyTextAlign(label, className) {
    return new prosemirrorMenu.MenuItem({
        title: "Align " + label,
        label: label,
        icon: prosemirrorMenu.icons.code,
        enable: function enable(state) {
            return state.selection != null;
        },
        run: function run(state, _, view) {
            // var ref = state.selection;
            // const commands = []
            // helper.findNodeBySelection(
            //     (node) => {
            //         if (!commands.filter(({ type }) => type === node.type.name).length) {
            //             commands.push({
            //                 command:
            //                     setBlockType(
            //                         node.type,
            //                         { class: className, isBeingAligned: true })
            //             })
            //         }
            //     })
            // commands.forEach(({ command }) => command(view.state, view.dispatch))
        }
    })
}


export default viewSource;
