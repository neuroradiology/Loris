<?php
/**
 * This class provides the php code to create the menu filter to display resolved
 * conflicts as part of the conflict resolver
 *
 * PHP Version 5
 *
 * @category Behavioural
 * @package  Main
 * @author   Tara Campbell <tara.campbell@mail.mcgill.ca>
 * @license  http://www.gnu.org/licenses/gpl-3.0.txt GPLv3
 * @link     https://github.com/aces/Loris-Trunk
 */

/**
 * Menu_Filter_Form_resolved_conflicts Class
 *
 * This class provides the php code to create the menu filter to display resolved
 * conflicts as part of the conflict resolver
 *
 * @category Behavioural
 * @package  Main
 * @author   Tara Campbell <tara.campbell@mail.mcgill.ca>
 * @license  http://www.gnu.org/licenses/gpl-3.0.txt GPLv3
 * @link     https://github.com/aces/Loris-Trunk
 */

class NDB_Menu_Filter_Resolved_Conflicts extends NDB_Menu_Filter
{

    /**
     * Determine whether the user should have access to this submodule
     *
     * @return boolean true if the user has access
     */
    function _hasAccess()
    {
        // create user object
        $user =& User::singleton();
        return ($user->hasPermission('conflict_resolver'));
    }


    /**
     * Sets up the query for the resolved_conflicts submodule
     *
     * @return none
     */
    function _setupVariables()
    {
        // set the class variables
        $config =& NDB_Config::singleton();

        $useProjects = $config->getSetting("useProjects");
        if ($useProjects === "false") {
            $useProjects = false;
        }

        $this->columns = array(
                          'conflicts_resolved.TableName',
                          'session.CandID',
                          'candidate.PSCID',
                          'session.Visit_label',
                          'conflicts_resolved.ResolutionTimestamp',
                         );

        if ($useProjects) {
            $this->columns[] = 'candidate.ProjectID as Project';
        }

        $this->columns = array_merge(
            $this->columns,
            array(
             'conflicts_resolved.FieldName',
             'conflicts_resolved.NewValue',
             'conflicts_resolved.OldValue1',
             'conflicts_resolved.OldValue2',
             'session.CenterID',
            )
        );
        $this->query   = " FROM conflicts_resolved
            LEFT JOIN flag ON (conflicts_resolved.CommentId1=flag.CommentID)
            LEFT JOIN session ON (flag.SessionID=session.ID)
            LEFT JOIN candidate ON (candidate.CandID=session.CandID) WHERE 1=1";

        $user = User::singleton();
        if (!$user->hasPermission('access_all_profiles')) {
            // restrict data to own site
            $this->query .= " AND candidate.CenterID=";
            $this->query .= $user->getCenterID();
        }

        $this->group_by     = '';
        $this->order_by     = 'conflicts_resolved.TableName, session.Visit_label';
        $this->validFilters = array(
                               'conflicts_resolved.TableName',
                               'session.CenterID',
                               'session.Visit_label',
                               'conflicts_resolved.ResolutionTimestamp',
                              );

        if ($useProjects) {
            $this->validFilters[] = 'candidate.ProjectID';
        }

        $this->validFilters = array_merge(
            $this->validFilters,
            array(
             'candidate.PSCID',
             'session.CandID',
             'conflicts_resolved.Fieldname',
            )
        );

        $this->headers = array(
                          'TableName',
                          'CandID',
                          'PSCID',
                          'Visit_label',
                          'ResolutionTimestamp',
                         );

        if ($useProjects) {
            $this->headers = array_merge(
                $this->headers,
                array('candidate.ProjectID' => 'Project')
            );
        }

        $this->headers[] = 'FieldName';
        $con = "conflicts_resolved";

        $this->formToFilter = array(
                               'Instrument'          => "$con.TableName",
                               'site'                => 'session.CenterID',
                               'visit'               => 'session.Visit_label',
                               'ResolutionTimestamp' => "$con.ResolutionTimestamp",
                              );

        if ($useProjects) {
            $this->formToFilter = array_merge(
                $this->formToFilter,
                array('Project' => 'candidate.ProjectID')
            );
        }

        $this->formToFilter = array_merge(
            $this->formToFilter,
            array(
             'CandID'   => 'session.CandID',
             'PSCID'    => 'candidate.PSCID',
             'Question' => 'conflicts_resolved.Fieldname',
            )
        );
        return true;
    }

    /**
     * Adds the form elements required for the filter
     *
     * @return none
     */
    function _setFilterForm()
    {
        // Create user object
        $user   =& User::singleton();
        $config =& NDB_Config::singleton();

        // Get instruments
        $instruments = Utility::getAllInstruments();
        $instruments = array_merge(array('' => 'All Instruments'), $instruments);

        // Get visits
        $visits = Utility::getVisitList();
        $visits = array_merge(array('' => 'All'), $visits);

        // Get sites
        if ($user->hasPermission('access_all_profiles')) {
            // get the list of study sites - to be replaced by the Site object
            $sites = Utility::getSiteList();
            if (is_array($sites)) {
                $sites = array('' => 'All') + $sites;
            }
        } else {
            // allow only to view own site data
            $site =& Site::singleton($user->getData('CenterID'));
            if ($site->isStudySite()) {
                $sites = array($user->getData('CenterID') => $user->getData('Site'));
            }
        }

        // Add form elements
        $this->addSelect('site', 'Site:', $sites);
        $this->addSelect('Instrument', 'Instrument:', $instruments);
        $this->addSelect('visit', 'Visit label:', $visits);
        $this->addBasicText(
            'CandID',
            'DCCID:',
            array(
             "size"      => 9,
             "maxlength" => 6,
            )
        );
        $this->addBasicText(
            'PSCID',
            'PSCID:',
            array(
             "size"      => 9,
             "maxlength" => 7,
            )
        );
        $this->addBasicText('Question', 'Search keyword:');
        $this->addBasicText('ResolutionTimestamp', 'Resolution Timestamp:');

        // Project list, if applicable
        if ($config->getSetting("useProjects")==="true") {
            $list_of_projects = array(null => 'All');
            $projectList      = Utility::getProjectList();
            foreach ($projectList as $key => $value) {
                $list_of_projects[$key] = $value;
            }
            $this->addSelect('Project', 'Project: ', $list_of_projects);
        }

        return true;
    }

    /**
     * Overrides the default setDataTableRows in order to not
     * show the elements that are only selected to add them to
     * a form, but aren't part of the table itself.
     *
     * @param integer $count The number of rows
     *
     * @return none
     */
    function _setDataTableRows($count)
    {
        $DB =& Database::singleton();

        $config =& NDB_Config::singleton();

        if ($config->getSetting("useProjects")==="true") {
            $projectList = Utility::getProjectList();
        }

        $x = 0;
        foreach ($this->list as $item) {
            //count column
            $this->tpl_data['items'][$x][0]['value'] = $x + $count;

            //print out data rows
            $i = 1;
            foreach ($item as $key => $val) {
                if ($key=='TableName'
                    || $key=='CandID'
                    || $key=='PSCID'
                    || $key=='Visit_label'
                    || $key=='ResolutionTimestamp'
                    || $key=='FieldName'
                ) {
                    $this->tpl_data['items'][$x][$i]['name']  = $key;
                    $this->tpl_data['items'][$x][$i]['value'] = $val;
                } else if ($key=='Project') {
                    $this->tpl_data['items'][$x][$i]['name']  = $key;
                    $this->tpl_data['items'][$x][$i]['value'] = (isset(
                        $projectList[$val]
                    )
                        ? $projectList[$val] : ""
                    );
                } else if ($key=='NewValue') {
                    if ($item['NewValue'] == 1) {
                        $NewValue = $item['OldValue1'];
                    } elseif ($item['NewValue'] == 2) {
                        $NewValue = $item['OldValue2'];
                    }
                    $this->tpl_data['items'][$x][$i]['name']  = $key;
                    $this->tpl_data['items'][$x][$i]['value'] = $NewValue;
                }
                $i++;
            }
            $x++;
        }

        return true;
    }
}

?>
