/**
 * Issue add/edit form
 *
 * Displays a form allowing a user to edit fields.
 * Includes functionality for both adding a new issue
 * and editing an existing issue.
 *
 * @author Caitrin Armstrong
 * */

var CollapsibleComment = React.createClass({
    displayName: 'CollapsibleComment',

    getInitialState: function () {
        return { 'collapsed': true };
    },
    toggleCollapsed: function () {
        this.setState({ 'collapsed': !this.state.collapsed });
    },
    render: function () {
        var history_text = [];
        var comment_hist_bool = this.state.collapsed ? "Show Comment History" : "Hide Comment History";
        var commentHistory = this.props.commentHistory;
        for (var comment in commentHistory) {
            if (commentHistory[comment]["fieldChanged"] == 'comment') {
                history_text.push("  [" + commentHistory[comment]["dateAdded"] + "] ", React.createElement(
                    'b',
                    null,
                    ' ',
                    commentHistory[comment]["addedBy"],
                    ' '
                ), " commented", React.createElement(
                    'i',
                    null,
                    ' ',
                    commentHistory[comment]["newValue"],
                    ' '
                ), React.createElement('br', null));
            } else {
                history_text.push("  [" + commentHistory[comment]["dateAdded"] + "] ", React.createElement(
                    'b',
                    null,
                    ' ',
                    commentHistory[comment]["addedBy"],
                    ' '
                ), " updated the " + commentHistory[comment]["fieldChanged"] + " to", React.createElement(
                    'i',
                    null,
                    ' ',
                    commentHistory[comment]["newValue"],
                    ' '
                ), React.createElement('br', null));
            }
        }
        return React.createElement(
            'div',
            { className: 'row form-group' },
            React.createElement(
                'div',
                { className: 'col-sm-9' },
                React.createElement(
                    'div',
                    { className: 'btn btn-primary',
                        onClick: this.toggleCollapsed,
                        'data-toggle': 'collapse',
                        'data-target': '#comment-history'
                    },
                    comment_hist_bool
                )
            ),
            React.createElement('br', null),
            React.createElement(
                'div',
                { id: 'comment-history' },
                React.createElement(
                    'div',
                    { className: 'col-sm-9' },
                    history_text
                )
            )
        );
    }
});

var IssueEditForm = React.createClass({
    displayName: 'IssueEditForm',


    propTypes: {
        DataURL: React.PropTypes.string.isRequired,
        action: React.PropTypes.string.isRequired
    },

    getInitialState: function () {
        return {
            'Data': [],
            'formData': {},
            'submissionResult': null,
            'errorMessage': null,
            'isLoaded': false,
            'loadedData': 0,
            'isNewIssue': false,
            'issueID': 0
        };
    },

    componentDidMount: function () {
        this.getDataAndChangeState();
    },

    render: function () {
        if (!this.state.isLoaded) {
            if (this.state.error != undefined) {
                return React.createElement(
                    'div',
                    { className: 'alert alert-danger text-center' },
                    React.createElement(
                        'strong',
                        null,
                        this.state.error
                    )
                );
            }
            return React.createElement(
                'button',
                { className: 'btn-info has-spinner' },
                'loading',
                React.createElement('span', { className: 'glyphicon glyphicon-refresh glyphicon-refresh-animate' })
            );
        }

        var helpText = "A title and assignee are required"; // todo: here fill out the fields that are neccessary.
        var alertMessage = "";
        var alertClass = "alert text-center hide";
        var hasEditPermission = this.state.Data.hasEditPermission || this.state.Data.isOwnIssue || this.state.isNewIssue;

        var headerText = " ";
        if (this.state.isNewIssue) {
            headerText = "Create New Issue";
        } else {
            headerText = "Edit Issue #" + this.state.issueData.issueID;
        }

        var lastUpdateValue = " ";
        if (this.state.isNewIssue) {
            lastUpdateValue = "Never!";
        } else {
            lastUpdateValue = this.state.issueData.lastUpdate;
        }

        var lastUpdatedByValue = " ";
        if (this.state.isNewIssue) {
            lastUpdatedByValue = "No-one!";
        } else {
            lastUpdatedByValue = this.state.issueData.lastUpdatedBy;
        }

        var dateCreated = " ";
        if (this.state.isNewIssue) {
            dateCreated = "Sometime Soon!";
        } else {
            dateCreated = this.state.issueData.dateCreated;
        }

        var isWatching = "";
        if (this.state.issueData.watching) {
            isWatching = "Yes";
        } else {
            isWatching = "No";
        }

        var submitButtonValue = "";
        if (this.state.isNewIssue) {
            submitButtonValue = "Submit Issue";
        } else {
            submitButtonValue = "Update Issue";
        }
        var commentLabel = "";
        if (this.state.isNewIssue) {
            commentLabel = "Description";
        } else {
            commentLabel = "New Comment";
        }

        var commentHistory;
        if (!this.state.isNewIssue) {
            commentHistory = React.createElement(CollapsibleComment, {
                commentHistory: this.state.issueData.commentHistory
            });
        } else {
            commentHistory = React.createElement(
                'div',
                { 'class': 'form-group' },
                ' '
            );
        }

        if (this.state.submissionResult) {
            if (this.state.submissionResult == "success") {
                alertClass = "alert alert-success text-center";
                alertMessage = "Submission Successful!";
            } else if (this.state.submissionResult == "error") {
                var errorMessage = this.state.errorMessage;
                alertClass = "alert alert-danger text-center";
                alertMessage = errorMessage ? errorMessage : "Failed to submit issue :(";
            } else if (this.state.submissionResult == "invalid") {
                var errorMessage = this.state.errorMessage;
                alertClass = "alert alert-danger text-center";
                alertMessage = errorMessage ? errorMessage : "Invalid input";
            }
        }
        var header;
        var description;
        if (!this.state.isNewIssue) {
            header = React.createElement(
                'div',
                null,
                React.createElement(
                    'div',
                    { className: 'row' },
                    React.createElement(
                        'div',
                        { className: 'col-md-6' },
                        React.createElement(StaticElement, {
                            name: 'lastUpdate',
                            label: "Last Update: ",
                            ref: 'lastUpdate',
                            text: lastUpdateValue
                        })
                    ),
                    React.createElement(
                        'div',
                        { className: 'col-md-6' },
                        React.createElement(StaticElement, {
                            name: 'lastUpdatedBy',
                            label: "Last Updated By: ",
                            ref: 'lastUpdatedBy',
                            text: lastUpdatedByValue
                        })
                    )
                ),
                React.createElement(
                    'div',
                    { className: 'row' },
                    React.createElement(
                        'div',
                        { className: 'col-md-6' },
                        React.createElement(StaticElement, {
                            name: 'dateCreated',
                            label: "Date Created: ",
                            ref: 'dateCreated',
                            text: dateCreated
                        })
                    ),
                    React.createElement(
                        'div',
                        { className: 'col-md-6' },
                        React.createElement(StaticElement, {
                            name: 'reporter',
                            label: "Reporter: ",
                            ref: 'reporter',
                            text: this.state.issueData.reporter
                        })
                    )
                )
            );

            var description = React.createElement(
                'div',
                null,
                React.createElement(
                    'div',
                    { 'class': 'row' },
                    React.createElement(StaticElement, {
                        name: 'description',
                        label: 'Description',
                        ref: 'description',
                        text: this.state.issueData.desc
                    })
                )
            );
        }

        return React.createElement(
            'div',
            null,
            React.createElement(
                FormElement,
                {
                    name: 'issueEdit',
                    onSubmit: this.handleSubmit,
                    ref: 'form',
                    'class': ''
                },
                React.createElement(
                    'h3',
                    null,
                    headerText
                ),
                React.createElement('br', null),
                header,
                React.createElement('br', null),
                React.createElement('br', null),
                React.createElement(
                    'div',
                    { 'class': 'row' },
                    React.createElement(
                        'div',
                        { 'class': 'col-sm-6' },
                        React.createElement(
                            'div',
                            { 'class': 'row' },
                            React.createElement(TextboxElement, {
                                name: 'title',
                                label: 'Title',
                                onUserInput: this.setFormData,
                                ref: 'title',
                                value: this.state.issueData.title,
                                disabled: !hasEditPermission,
                                required: true
                            })
                        ),
                        description,
                        React.createElement(
                            'div',
                            { 'class': 'row' },
                            React.createElement(SelectElement, {
                                name: 'assignee',
                                label: 'Assignee',
                                emptyOption: true,
                                options: this.state.Data.assignees,
                                onUserInput: this.setFormData,
                                ref: 'assignee',
                                disabled: !hasEditPermission,
                                value: this.state.issueData.assignee,
                                required: true
                            })
                        ),
                        React.createElement(
                            'div',
                            { 'class': 'row' },
                            React.createElement(SelectElement, {
                                name: 'centerID',
                                label: 'Site',
                                emptyOption: true,
                                options: this.state.Data.sites,
                                onUserInput: this.setFormData,
                                ref: 'centerID',
                                disabled: !hasEditPermission,
                                value: this.state.issueData.centerID
                            })
                        ),
                        React.createElement(
                            'div',
                            { 'class': 'row' },
                            React.createElement(SelectElement, {
                                name: 'status',
                                label: 'Status',
                                emptyOption: false,
                                options: this.state.Data.statuses,
                                onUserInput: this.setFormData,
                                ref: 'status',
                                disabled: !hasEditPermission,
                                value: this.state.issueData.status // todo: edit this so the options are different if the user doesn't have permission
                            })
                        ),
                        React.createElement(
                            'div',
                            { 'class': 'row' },
                            React.createElement(SelectElement, {
                                name: 'priority',
                                label: 'Priority',
                                emptyOption: false,
                                options: this.state.Data.priorities,
                                onUserInput: this.setFormData,
                                ref: 'priority',
                                required: false,
                                disabled: !hasEditPermission,
                                value: this.state.issueData.priority
                            })
                        ),
                        React.createElement(
                            'div',
                            { 'class': 'row' },
                            React.createElement(SelectElement, {
                                name: 'category',
                                label: 'Category',
                                emptyOption: true,
                                options: this.state.Data.categories,
                                onUserInput: this.setFormData,
                                ref: 'category',
                                disabled: !hasEditPermission,
                                value: this.state.issueData.category
                            })
                        ),
                        React.createElement(
                            'div',
                            { 'class': 'row' },
                            React.createElement(SelectElement, {
                                name: 'module',
                                label: 'Module',
                                emptyOption: true,
                                options: this.state.Data.modules,
                                onUserInput: this.setFormData,
                                ref: 'module',
                                disabled: !hasEditPermission,
                                value: this.state.issueData.module
                            })
                        ),
                        React.createElement(
                            'div',
                            { 'class': 'row' },
                            React.createElement(TextboxElement, {
                                name: 'PSCID',
                                label: 'PSCID',
                                onUserInput: this.setFormData,
                                ref: 'PSCID',
                                disabled: !hasEditPermission,
                                value: this.state.issueData.PSCID
                            })
                        ),
                        React.createElement(
                            'div',
                            { 'class': 'row' },
                            React.createElement(TextboxElement, {
                                name: 'visitLabel',
                                label: 'Visit Label',
                                onUserInput: this.setFormData,
                                ref: 'visitLabel',
                                disabled: !hasEditPermission,
                                value: this.state.issueData.visitLabel
                            })
                        ),
                        React.createElement(
                            'div',
                            { 'class': 'row' },
                            React.createElement(SelectElement, {
                                name: 'watching',
                                label: 'Watching?',
                                emptyOption: false,
                                options: { 'No': 'No', 'Yes': 'Yes' },
                                onUserInput: this.setFormData,
                                ref: 'watching',
                                value: isWatching
                            })
                        ),
                        React.createElement(
                            'div',
                            { 'class': 'row' },
                            React.createElement(SelectElement, {
                                name: 'othersWatching',
                                label: 'Add others to watching?',
                                emptyOption: true,
                                options: this.state.Data.otherWatchers,
                                onUserInput: this.setFormData,
                                ref: 'watching',
                                multiple: true,
                                value: this.state.issueData.whoIsWatching
                            })
                        ),
                        React.createElement(
                            'div',
                            { 'class': 'row' },
                            React.createElement(TextareaElement, {
                                name: 'comment',
                                label: commentLabel,
                                onUserInput: this.setFormData,
                                ref: 'comment',
                                value: null
                            })
                        ),
                        React.createElement(
                            'div',
                            { 'class': 'row submit-area' },
                            React.createElement(ButtonElement, { label: submitButtonValue }),
                            React.createElement(
                                'div',
                                { 'class': 'col-md-3' },
                                React.createElement(
                                    'div',
                                    { className: alertClass, role: 'alert', ref: 'alert-message' },
                                    alertMessage
                                )
                            )
                        )
                    ),
                    React.createElement(
                        'div',
                        { 'class': 'col-sm-6' },
                        React.createElement(
                            'div',
                            { 'class': 'row' },
                            commentHistory
                        )
                    )
                )
            )
        );
    },

    /**
     * Creates an ajax request and sets the state with the result
     */
    getDataAndChangeState: function () {
        var that = this;

        var dataURL = this.props.DataURL;

        $.ajax(dataURL, {
            dataType: 'json',
            xhr: function () {
                var xhr = new window.XMLHttpRequest();
                xhr.addEventListener("progress", function (evt) {
                    that.setState({
                        'loadedData': evt.loaded
                    });
                });
                return xhr;
            },

            success: function (data) {
                if (!data.issueData.issueID) {
                    that.setState({ 'isNewIssue': true });
                }

                var formData = {
                    'issueID': data.issueData.issueID,
                    'title': data.issueData.title,
                    'lastUpdate': data.issueData.lastUpdate,
                    'centerID': data.issueData.centerID,
                    'PSCID': data.issueData.PSCID,
                    'reporter': data.issueData.reporter,
                    'assignee': data.issueData.assignee,
                    'status': data.issueData.status,
                    'priority': data.issueData.priority,
                    'watching': data.issueData.watching,
                    'visitLabel': data.issueData.visitLabel,
                    'dateCreated': data.issueData.dateCreated,
                    'category': data.issueData.category,
                    'lastUpdatedBy': data.issueData.lastUpdatedBy,
                    'history': data.issueData.history,
                    'comment': data.issueData.comment,
                    'otherWatchers': data.issueData.whoIsWatching
                };

                that.setState({
                    'Data': data,
                    'isLoaded': true,
                    'issueData': data.issueData,
                    'formData': formData
                });

                that.setState({
                    'error': "finished success"
                });
            },
            error: function (data, error_code, error_msg) {
                that.setState({
                    'error': error_msg
                });
            }
        });
    },

    /**
     * Handles form submission
     *
     * @param e
     */
    handleSubmit: function (e) {
        e.preventDefault();

        var self = this;
        var myFormData = this.state.formData;
        var formRefs = this.refs;
        var formData = new FormData();
        var issueData = this.state.issueData;

        // Validate the form
        if (!this.isValidForm(formRefs, myFormData)) {
            return;
        }

        for (var key in myFormData) {
            if (myFormData[key] != "" && myFormData[key] !== issueData[key]) {
                formData.append(key, myFormData[key]);
            }
        }

        formData.append('issueID', this.state.Data.issueData.issueID);

        $.ajax({
            type: 'POST',
            url: self.props.action,
            data: formData,
            cache: false,
            dataType: 'json',
            contentType: false,
            processData: false,
            xhr: function () {
                var xhr = new window.XMLHttpRequest();
                xhr.upload.addEventListener("progress", function (evt) {
                    if (evt.lengthComputable) {
                        var progressbar = $("#progressbar");
                        var progresslabel = $("#progresslabel");
                        var percent = Math.round(evt.loaded / evt.total * 100);
                        $(progressbar).width(percent + "%");
                        $(progresslabel).html(percent + "%");
                        progressbar.attr('aria-valuenow', percent);
                    }
                }, false);
                return xhr;
            },

            success: function (data) {
                if (!data.isValidSubmission) {
                    self.setState({
                        errorMessage: data.invalidMessage,
                        submissionResult: "invalid"
                    });
                    self.showAlertMessage();
                    return;
                }

                self.setState({
                    submissionResult: "success",
                    issueID: data.issueID
                });
                self.getDataAndChangeState();
                self.showAlertMessage();

                if (self.state.isNewIssue) {
                    setTimeout(function () {
                        window.location.assign('/issue_tracker');
                    }, 2000);
                }
            },
            error: function (err) {
                console.error(err);
                self.setState({
                    submissionResult: "error"
                });
                self.showAlertMessage();
            }

        });
    },

    /**
     * Sets the form data based on state values of child elements/componenets
     *
     * @param formElement
     * @param value
     */
    setFormData: function (formElement, value) {
        // todo: only give valid inputs for fields given previous input to other fields

        var formDataUpdate = this.state.formData;
        formDataUpdate[formElement] = value;

        this.setState({
            formData: formDataUpdate
        });
    },

    /**
     * Validates the form
     * Except not entirely because PSCID and visitLabel are not validated.
     *
     * @param formRefs
     * @param formData
     *
     * @returns {boolean}
     */
    isValidForm: function (formRefs, formDataToCheck) {
        var isValidForm = true;
        var requiredFields = {
            'title': null,
            'assignee': null
        };
        Object.keys(requiredFields).map(function (field) {
            if (formDataToCheck[field]) {
                requiredFields[field] = formDataToCheck[field];
            } else {
                if (formRefs[field]) {
                    formRefs[field].props.hasError = true;
                    isValidForm = false;
                }
            }
        });
        this.forceUpdate();
        return isValidForm;
    },

    /**
     * Display a success/error alert message after form submission
     */
    showAlertMessage: function () {
        var self = this;

        if (this.refs["alert-message"] == null) {
            return;
        }

        var alertMsg = React.findDOMNode(this.refs["alert-message"]);
        $(alertMsg).fadeTo(2000, 500).delay(5000).slideUp(500, function () {
            self.setState({
                uploadResult: null
            });
        });
    }

});

var RIssueEditForm = React.createFactory(IssueEditForm);