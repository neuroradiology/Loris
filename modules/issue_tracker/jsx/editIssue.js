/**
 * Issue add/edit form
 *
 * Displays a form allowing a user to edit fields.
 * Includes functionality for both adding a new issue
 * and editing an existing issue.
 *
 * @author Caitrin Armstrong
 * */

var CollapsibleComment = React.createClass(
    {
        getInitialState: function () {
            return {'collapsed': true};
        },
        toggleCollapsed: function () {
            this.setState({'collapsed': !this.state.collapsed}
            );
        },
        render: function () {
            var history_text = [];
            var comment_hist_bool = this.state.collapsed ? "Show Comment History" : "Hide Comment History";
            var commentHistory = this.props.commentHistory;
            for (var comment in commentHistory) {
                if (commentHistory[comment]["fieldChanged"] == 'comment') {
                    history_text.push("  [" +
                        commentHistory[comment]["dateAdded"] +
                        "] ",
                        <b> {commentHistory[comment]["addedBy"]} </b>,
                        " commented",
                        <i> {commentHistory[comment]["newValue"]} </i>,
                        <br/>)
                } else {
                    history_text.push("  [" +
                        commentHistory[comment]["dateAdded"] +
                        "] ",
                        <b> {commentHistory[comment]["addedBy"]} </b>,
                        " updated the " +
                        commentHistory[comment]["fieldChanged"] +
                        " to",
                        <i> {commentHistory[comment]["newValue"]} </i>,
                        <br/>)
                }
            }
            return (
                <div className="row form-group">
                    <div className="col-sm-9">
                        <div className="btn btn-primary"
                             onClick={this.toggleCollapsed}
                             data-toggle="collapse"
                             data-target="#comment-history"
                        >
                            {comment_hist_bool}
                        </div>
                    </div>
                    <br></br>
                    <div id="comment-history">
                        <div className="col-sm-9">
                        {history_text}
                        </div>

                    </div>
                </div>
            )
        }
    });

var IssueEditForm = React.createClass(
    {

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
                    return (
                        <div className="alert alert-danger text-center">
                            <strong>
                                {this.state.error}
                            </strong>
                        </div>
                    );
                }
                return (
                    <button className="btn-info has-spinner">
                        loading
                        <span className="glyphicon glyphicon-refresh glyphicon-refresh-animate"></span>
                    </button>
                );
            }

            var helpText = "A title and assignee are required"; // todo: here fill out the fields that are neccessary.
            var alertMessage = "";
            var alertClass = "alert text-center hide";
            var hasEditPermission = this.state.Data.hasEditPermission || this.state.Data.isOwnIssue || this.state.isNewIssue;

            var headerText = " ";
            if (this.state.isNewIssue) {
                headerText = "Create New Issue";
            }
            else {
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
            if (this.state.issueData.watching){
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
                commentHistory = <CollapsibleComment
                    commentHistory={this.state.issueData.commentHistory}
                />;
            } else {
                commentHistory = <div class="form-group">
                    &nbsp;
                </div>
            }


            if (this.state.submissionResult) {
                if (this.state.submissionResult == "success") {
                    alertClass = "alert alert-success text-center";
                    alertMessage = "Submission Successful!";
                } else if (this.state.submissionResult == "error") {
                    var errorMessage = this.state.errorMessage;
                    alertClass = "alert alert-danger text-center";
                    alertMessage = errorMessage ? errorMessage : "Failed to submit issue :(";
                }
                else if (this.state.submissionResult == "invalid") {
                    var errorMessage = this.state.errorMessage;
                    alertClass = "alert alert-danger text-center";
                    alertMessage = errorMessage ? errorMessage : "Invalid input";
                }
            }
            var header;
            var description;
            if (!this.state.isNewIssue) {
                header = <div>
                    <div className="row">
                        <div className="col-md-6">
                            <StaticElement
                                name="lastUpdate"
                                label={"Last Update: "}
                                ref="lastUpdate"
                                text={lastUpdateValue}
                            />
                        </div>
                        <div className="col-md-6">
                            <StaticElement
                                name="lastUpdatedBy"
                                label={"Last Updated By: "}
                                ref="lastUpdatedBy"
                                text={lastUpdatedByValue}
                            />
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-md-6">
                            <StaticElement
                                name="dateCreated"
                                label={"Date Created: "}
                                ref="dateCreated"
                                text={dateCreated}
                            />
                        </div>
                        <div className="col-md-6">
                            <StaticElement
                                name="reporter"
                                label={"Reporter: "}
                                ref="reporter"
                                text={this.state.issueData.reporter}
                            />
                        </div>
                    </div>
                </div>

                var description = <div>
                    <div class="row">
                        <StaticElement
                            name="description"
                            label="Description"
                            ref="description"
                            text={this.state.issueData.desc}
                        />
                    </div>
                </div>

            }

            return (
                <div>
                    <FormElement
                        name="issueEdit"
                        onSubmit={this.handleSubmit}
                        ref="form"
                        class=""
                    >
                        <h3>{headerText}</h3>
                        <br />

                        {header}

                        <br></br>
                        <br></br>

                        <div class="row">
                            <div class="col-sm-6">
                                <div class="row">
                                    <TextboxElement
                                        name="title"
                                        label="Title"
                                        onUserInput={this.setFormData}
                                        ref="title"
                                        value={this.state.issueData.title}
                                        disabled={!hasEditPermission}
                                        required={true}
                                    />
                                </div>

                                {description}

                                <div class="row">
                                    <SelectElement
                                        name="assignee"
                                        label="Assignee"
                                        emptyOption={true}
                                        options={this.state.Data.assignees}
                                        onUserInput={this.setFormData}
                                        ref="assignee"
                                        disabled={!hasEditPermission}
                                        value={this.state.issueData.assignee}
                                        required={true}
                                    />
                                </div>
                                <div class="row">
                                    <SelectElement
                                        name="centerID"
                                        label="Site"
                                        emptyOption={true}
                                        options={this.state.Data.sites}
                                        onUserInput={this.setFormData}
                                        ref="centerID"
                                        disabled={!hasEditPermission}
                                        value={this.state.issueData.centerID}
                                    />
                                </div>

                                <div class="row">
                                    <SelectElement
                                        name="status"
                                        label="Status"
                                        emptyOption={false}
                                        options={this.state.Data.statuses}
                                        onUserInput={this.setFormData}
                                        ref="status"
                                        disabled={!hasEditPermission}
                                        value={this.state.issueData.status} // todo: edit this so the options are different if the user doesn't have permission
                                    />
                                </div>
                                <div class="row">
                                    <SelectElement
                                        name="priority"
                                        label="Priority"
                                        emptyOption={false}
                                        options={this.state.Data.priorities}
                                        onUserInput={this.setFormData}
                                        ref="priority"
                                        required={false}
                                        disabled={!hasEditPermission}
                                        value={this.state.issueData.priority}
                                    />
                                </div>

                                <div class="row">
                                    <SelectElement
                                        name="category"
                                        label="Category"
                                        emptyOption={true}
                                        options={this.state.Data.categories}
                                        onUserInput={this.setFormData}
                                        ref="category"
                                        disabled={!hasEditPermission}
                                        value={this.state.issueData.category}
                                    />
                                </div>
                                <div class="row">
                                    <SelectElement
                                        name="module"
                                        label="Module"
                                        emptyOption={true}
                                        options={this.state.Data.modules}
                                        onUserInput={this.setFormData}
                                        ref="module"
                                        disabled={!hasEditPermission}
                                        value={this.state.issueData.module}
                                    />
                                </div>

                                <div class="row">
                                    <TextboxElement
                                        name="PSCID"
                                        label="PSCID"
                                        onUserInput={this.setFormData}
                                        ref="PSCID"
                                        disabled={!hasEditPermission}
                                        value={this.state.issueData.PSCID}
                                    />
                                </div>
                                <div class="row">
                                    <TextboxElement
                                        name="visitLabel"
                                        label="Visit Label"
                                        onUserInput={this.setFormData}
                                        ref="visitLabel"
                                        disabled={!hasEditPermission}
                                        value={this.state.issueData.visitLabel}
                                    />
                                </div>

                                <div class="row">
                                    <SelectElement
                                        name="watching"
                                        label="Watching?"
                                        emptyOption={false}
                                        options={{'No': 'No', 'Yes': 'Yes'}}
                                        onUserInput={this.setFormData}
                                        ref="watching"
                                        value={isWatching}
                                    />
                                </div>

                                <div class="row">
                                    <SelectElement
                                        name="othersWatching"
                                        label="Add others to watching?"
                                        emptyOption={true}
                                        options={this.state.Data.otherWatchers}
                                        onUserInput={this.setFormData}
                                        ref="watching"
                                        multiple={true}
                                        value={this.state.issueData.whoIsWatching}
                                    />
                                </div>

                                <div class="row">
                                    <TextareaElement
                                        name="comment"
                                        label={commentLabel}
                                        onUserInput={this.setFormData}
                                        ref="comment"
                                        value={null}
                                    />
                                </div>

                                <div class="row submit-area">
                                    <ButtonElement label={submitButtonValue}/>

                                    <div class="col-md-3">
                                        <div className={alertClass} role="alert" ref="alert-message">
                                            {alertMessage}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-sm-6">
                                <div class="row">
                                    {commentHistory}
                                </div>
                            </div>
                        </div>
                    </FormElement>
                </
                    div >
            );
        },

        /**
         * Creates an ajax request and sets the state with the result
         */
        getDataAndChangeState: function () {
            var that = this;

            var dataURL = this.props.DataURL;

            $.ajax(
                dataURL,
                {
                    dataType: 'json',
                    xhr: function () {
                        var xhr = new window.XMLHttpRequest();
                        xhr.addEventListener(
                            "progress",
                            function (evt) {
                                that.setState(
                                    {
                                        'loadedData': evt.loaded
                                    }
                                );
                            }
                        );
                        return xhr;
                    },

                    success: function (data) {
                        if (!data.issueData.issueID) {
                            that.setState({'isNewIssue': true});
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

                        that.setState(
                            {
                                'Data': data,
                                'isLoaded': true,
                                'issueData': data.issueData,
                                'formData': formData
                            }
                        );

                        that.setState(
                            {
                                'error': "finished success"
                            }
                        );
                    },
                    error: function (data, error_code, error_msg) {
                        that.setState(
                            {
                                'error': error_msg
                            }
                        );
                    }
                }
            );
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

            $.ajax(
                {
                    type: 'POST',
                    url: self.props.action,
                    data: formData,
                    cache: false,
                    dataType: 'json',
                    contentType: false,
                    processData: false,
                    xhr: function () {
                        var xhr = new window.XMLHttpRequest();
                        xhr.upload.addEventListener(
                            "progress",
                            function (evt) {
                                if (evt.lengthComputable) {
                                    var progressbar = $("#progressbar");
                                    var progresslabel = $("#progresslabel");
                                    var percent = Math.round((evt.loaded / evt.total) * 100);
                                    $(progressbar).width(percent + "%");
                                    $(progresslabel).html(percent + "%");
                                    progressbar.attr('aria-valuenow', percent);
                                }
                            },
                            false
                        );
                        return xhr;
                    },

                    success: function (data) {
                        if (!data.isValidSubmission) {
                            self.setState(
                                {
                                    errorMessage: data.invalidMessage,
                                    submissionResult: "invalid"
                                }
                            );
                            self.showAlertMessage();
                            return;
                        }

                        self.setState(
                            {
                                submissionResult: "success",
                                issueID: data.issueID,
                            }
                        );
                        self.getDataAndChangeState();
                        self.showAlertMessage();

                        if (self.state.isNewIssue) {
                            setTimeout(function () {
                                window.location.assign('/issue_tracker')
                            }, 2000);
                        }
                    },
                    error: function (err) {
                        console.error(err);
                        self.setState(
                            {
                                submissionResult: "error"
                            }
                        );
                        self.showAlertMessage();
                    }

                }
            );
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

            this.setState(
                {
                    formData: formDataUpdate
                }
            );
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
            Object.keys(requiredFields).map(
                function (field) {
                    if (formDataToCheck[field]) {
                        requiredFields[field] = formDataToCheck[field];
                    } else {
                        if (formRefs[field]) {
                            formRefs[field].props.hasError = true;
                            isValidForm = false;
                        }
                    }
                }
            );
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
            $(alertMsg).fadeTo(2000, 500).delay(5000).slideUp(
                500,
                function () {
                    self.setState(
                        {
                            uploadResult: null
                        }
                    );
                }
            );
        }

    }
);

var RIssueEditForm = React.createFactory(IssueEditForm);
