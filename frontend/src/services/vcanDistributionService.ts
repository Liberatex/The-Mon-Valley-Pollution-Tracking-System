/**
 * VCAN Air Filter & Purifier Distribution Service
 * Manages addresses where VCAN has distributed air filters and purifiers
 */

import { AIR_FILTER_COORDINATES, AIR_PURIFIER_COORDINATES } from './vcanDistributionCoordinates';

export interface VCANDistributionLocation {
  id: string;
  address: string;
  zipCode: string;
  city: string;
  deviceType: 'filter' | 'purifier';
  location?: { lat: number; lng: number }; // Hardcoded coordinates from vcanDistributionCoordinates.ts
}

// Air Filter Addresses (left column)
const AIR_FILTER_ADDRESSES: string[] = [
  '149 Bellbridge Rd 15133',
  '1159 Lovedale Rd 15133',
  'Lincoln Blvd 15133',
  '3918 Liberty Way 15133',
  '1231 Lovedale Rd 15133',
  '2159 Lncoln Blvd 15133',
  '2819 Washington Blvd 15133',
  '504 Dersam St 15133',
  '1013 Upston St 15132',
  '1128 Burbank Rd 15133',
  '1331 Coranado Dr 15132',
  '211 Southern Ave 15132',
  '1007 Norwood St 15132',
  '1180 Romane Ave 15132',
  '1201 Washington Blvd 15133',
  '3308 Liberty Way 15132',
  '1035 Pleasant Ave 15132',
  '1001 Highland Ave 15132',
  '1618 New York Ave 15132',
  '409 Pasadina Dr 15132',
  '1131 Portsmouth Dr 15132',
  '205 Glenn Ave 15132',
  '1121 Portsmouth 15132',
  '1014 Washington Blvd 15132',
  '3203 Douglas Way 15132',
  '1014 Morton Ave 15132',
  '2802 D Street 15132',
  '1018 Morton Ave 15132',
  '3244 Jeffrey Drive 15132',
  '306 Dersam St 15132',
  '941 Elizabeth St 15133',
  '3214 Orchard Drive 15133',
  '3012 Liberty Way 15133',
  '3007 H Street 15133',
  '1390 Washington Blvd 15133',
  '3200 Oakland Dr 15133',
  '2906 Woodrow St 15133',
  '3100 Liberty Way 15133',
  '3233 Jeffrey Drive 15133',
  '2823 Washington Blvd 15133',
  '2825 Washington Blvd 15133',
  '306 Latrobe Street 15133',
  '2906 I Street 15133',
  '3014 Liberty Way 15133',
  '2823 Washington Blvd 15133',
  '2900 Valley St 15133',
  '311 Scene Ridge Rd 15133',
  '3101 H Street 15133',
  '3403 Orchard 15133',
  '212 Short St 15133',
  '2900 Lauck Ave 15133',
  '417 Monongahela Ave 15045',
  '440 Monongahela Ave 15045',
  '606 Marie St 15045',
  '221 Monongahela Ave 15045',
  '34 Erie Ave 15045',
  '614 Vermont Ave 15045',
  '2424 Washington Blvd 15045',
  '719 Deleware Ave 15045',
  '1113 Indiana Ave 15045',
  '823 Vermont Ave 15045',
  '828 Ohio Ave 15045',
  '1000 Edmundson Dr 15045',
  '2101 Washington Blvd 15045',
  '206 Ohio Ave 15045',
  '410 N Monongahela 15045',
  '420 Ohio Ave 15045',
  '26 Ohio Ave 15045',
  '619 Peach Alley 15045',
  '2034 Washington Blvd rear 15045',
  '716 Vermont Ave 15045',
  '716 Vermont Ave 15045',
  '526 Vermont Ave 15045',
  '528 Vermont Ave 15045',
  '323 N Monongahela Ave 15045',
  '741 Delaware Ave Rear 15045',
  '735.5 Monongahela Ave 15045',
  '1226 Atlantic Ave 15045',
  '615 8th St 15045',
  '302 Fairview Ave 15045',
  '342 Ohio Ave 15045',
  '403 Monongahela Ave 15045',
  '703 Ohio Ave 15045',
  '2053 Naomi 15045',
  '1016 Vermont Ave 15045',
  '1042 Indiana Ave 15045',
  '1002 Elm St 15045',
  '311 Marie Street 15045',
  '934 Delaware Ave 15045',
  '626 Monongahela Ave 15045',
  '105 Fern Way 15045',
  '411 Monongahela Ave 15045',
  '941 Vermont Ave 15045',
  '423 Monongahela Ave 15045',
  '430 Ohio Ave 15045',
  '2050 Washington Blvd 15045',
  '636 Ohio Ave 15045',
  '801 Vermont Ave 15045',
  '829 Monongahela Ave 15045',
  '1046 Indiana Ave 15045',
  '712 Delaware Ave 15045',
  '300 Marie Street 15045',
  '318 Euclid Ave 15045',
  '417 Harrison St 15045',
  '417 Harrison St 15045',
  '418 Arch St 15045',
  '940 Indiana Ave 15045',
  '437 Euclid Ave 15045',
  '216 Monongahela Ave 15045',
  '1005 Vermont Ave 15045',
  '623 Allegheny Ave 15045',
  '7 Ohio Ave 15045',
  '4 Erie Ave 15045',
  '445 Erie Ave 15045',
  '177 Mitchell Ave Clairton 15025',
  '514 Mitchell Ave Clairton 15025',
  '324 Crest Street Clairton 15025',
  '1048 Toman Ave Clairton 15025',
  '860 Vankirk St Clairton 15025',
  '257 Mitchell Ave Clairton 15025',
  '729 Sixth Street 15025',
  '352 Halcomb Ave',
  '1213 Marion Circle',
  '736 Horton St Clairton 15025',
  '6301 Soltis Drive',
  '830 School St Clairton 15025',
  '634 12th St Clairton 15025',
  '356 Mitchell AveClairton 15025',
  '815 Miller AveClairton 15025',
  '204 Mitchell Ave 15025',
  '419 Wylie AveClairton 15025',
  '323 Wylie AveClairton 15025',
  '140 Pennsylvania Ave Clairton 15025',
  '600 Waddell Ave Clairton 15025',
  '405 Washington Ave Clairton 15025',
  '2701 Lincoln Ave Clairton 15025',
  '908 Saint Clair 15025',
  '630 Park Ave Clairton 15025',
  '537 N Sixth St Clairton 15025',
  '1206 Marion Circle',
  '316 Walnut Ave Clairton 15025',
  '638 Miller Ave Clairton 15025',
  '423 N 3rd StClairton 15025',
  '701 Reed St Clairton 15025',
  '104 Shany Dr Clairton 15025',
  '1706 Marian Circle 15025',
  '249 Shaw Ave',
  '349 Wylie AveClairton 15025',
  '1303 Marion Circle 15025',
  '413 Halcomb AveClairton 15025 AptClairton 15025 1',
  '873 Miller AveClairton 15025',
  '1204 Marion Circle 15032',
  '333 Halcomb AveClairton 15025',
  '916 Miller AveClairton 15025(2)',
  '916 Miller AveClairton 15025',
  '240 Maple Ave 15025',
  '810 Miller AveClairton 15025',
  '726 StClairton 15025 Clair AveClairton 15025',
  '715 Large Ave Clairton 15025',
  '359 Wylie AveClairton 15025',
  '212 Waddell AveClairton 15025',
  '430 Wilson AveClairton 15025',
  '218 Baron AveClairton 15025',
  '463 Reed Street #1 15025',
  '503 5th StClairton 15025',
  '511 Ivy St Clairton 15025',
  '537 Third St 15025',
  '541 3rd St Clairton 15025',
  '348 Spruce St Clairton 15025',
  '768 Van Kirk StClairton 15025',
  '718 Reed StClairton 15025',
  '406 Chamber StClairton 15025',
  '341 Baker Ave 15025',
  '605 Park Ave 15025',
  '712 Miller AveClairton 15025',
  '7592 Fayette Dr Clairton 15025',
  '108 Carnegie AveClairton 15025',
  '824 Waddell AveClairton 15025',
  'Craig St Clairton 15025',
  '431 Large Ave Clairton 15025',
  '350 Wylie AveClairton 15025',
  '23 N 3rd StClairton 15025',
  '730 Horton St Clairton 15025',
  '634 Reed St',
  '1216 Worthington Ave Clairton 15025',
  '702 Wassell Ave 15025',
  '908 Waddell AveClairton 15025',
  '522 N 6th StClairton 15025',
  '239 Boundary AveClairton 15025',
  '436 Wilson AveClairton 15025',
  '605 Ridge St Clairton 15025',
  '744 Horton St Clairton 15025',
  '201 Baron AveClairton 15025',
  '177 Mitchell AveClairton 15025',
  '533 Wylie Ave',
  '508 St Clair Ave 15025',
  '528 Reed Street 15025',
  '514 3rd St Clairton 15025',
  '537 Wilson Ave 15025',
  '508 Ivy StClairton 15025',
  '609 Large Ave Clairton 15025',
  '311 Waddell AveClairton 15025',
  '313 Waddell AveClairton 15025',
  '206 Mendelsohn Ave',
  '216 N 3rd StClairton 15025',
  '324 Baker AveClairton 15025',
  '753 Horton St Clairton 15025',
  '508 Farnsworth AveClairton 15025',
  '661 Reed St Clairton 15025',
  '708 Lafayette St Clairton 15025',
  '1540 Gilmore Drive 15025',
  '2101 Polk AveClairton 15025',
  '231 Pennsylvania Ave Clairton 15025',
  '422 N 4th StClairton 15025',
  '518 N State StClairton 15025',
  '341 Wylie AveClairton 15025',
  '198 Baker AveClairton 15025',
  '430 Baker AveClairton 15025',
  '446 Mitchell AveClairton 15025',
  '905 School St Clairton 15025',
  '919 Waddell AveClairton 15025',
  '829 Vankirk St 15205',
  '519 Reed Street 15025',
  '804 3rd St Clairton 15025',
  '565 Reed StClairton 15025',
  '705 Reed St Clairton 15025',
  '448 3rd St Clairton 15025',
  '469 Reed St Clairton 15025',
  '448 3rd StClairton 15025 Rear',
  '615 Carnegie Ave Clairton 15025',
  '439 Mitshell Ave Clairton 15025',
  '670 Reed St Clairton 15025',
  '520 Holcomb Ave Clairton 15025',
  '443 Large Ave Clairton 15025',
  '374 Ohio Ave Clairton 15025',
  '251 Shaw Ave Clairton 15025',
  '424 Caldwell St Clairton 15025',
  '179 Halcomb Ave Clairton 15025',
  '466 Wilson Ave Clairton 15025',
  '436 Wilson Ave Clairton 15025',
  '583 Shady Ct Clairton 15025',
  '141 Baker Ave Clairton 15025',
  '605 Independence 15025',
  '263 Mitchell Ave 15025',
  '230 Halcomb Ave Clairton 15025',
  '605 Large Ave Clairton 15025',
  '751 Van Kirk St Clairton 15025',
  '347 Wylie Ave Clairton 15025',
  '929 Gary Ave Clairton 15025',
  '697 Reed St Clairton 15025',
  '510 Farnsworth Ave 15025',
  '673 Reed St Clairton 15025',
  '664 3rd St Clairton 15025',
  '427 Saint Clair Ave 15025',
  '817 School St Clairton 15025',
  '1205 Marion Circle 15025',
  '902 Madison Ave Clairton 15025',
  '422 N 3rd Street Clairton 15025',
  '535 Large Ave Clairton 15025',
  '314 Mendelssohn Ave  15025',
  '106 N 4th St Clairton 15025',
  '863 Horton Ave Clairton 15025',
  '521 Farnsworth Ave Clairton 15025',
  '143 Waddell Ave Clairton 15025',
  '911 Waddell Ave Clairton 15025',
  '427 Park Ave Clairton 15025',
  '888 Miller Ave Clairton 15025',
  '532 9th St Clairton 15025',
  '773 Vankirk St 15025',
  '5698 3rd St Clairton 15025',
  '120 Shaw Ave, Clairton 15025',
  '726 Waddell Ave Clairton 15025',
  '601 N 6th Street 15025',
  '465 3rd St Clairton 15025',
  '439 Wylie Ave Clairton 15025',
  '634 Farnsworth Ave Clairton 15025',
];

// Air Purifier Addresses (right column) - includes all addresses from the purifier list
// Note: Many addresses overlap with filters, but we'll mark them separately
const AIR_PURIFIER_ADDRESSES: string[] = [
  '177 Mitchell Ave, Clairton 15025',
  '514 Mitchell AveClairton 15025Clairton 15025',
  '324 Crest Street Clairton 15025',
  '1048 Toman AveClairton 15025 Clairton 15025',
  '860 Vankirk StClairton 15025 Clairton 15025',
  '257 Mitchell Ave Clairton 15025',
  '729 Sixth Street  Clairton 15025',
  '352 Halcomb Ave',
  '1213 Marion Circle  Clairton 15025',
  '736 Horton St Clairton 15025',
  '6301 Soltis Drive',
  '830 School StClairton 15025',
  '634 12th St Clairton 15025',
  '356 Mitchell Ave Clairton 15025',
  '815 Miller AveClairton 15025',
  '204 Mitchell Ave  Clairton 15025',
  '419 Wylie AveClairton 15025',
  '323 Wylie Ave Clairton 15025',
  '140 Pennsylvania AveClairton 15025',
  '600 Waddell AveClairton 15025',
  '405 Washington Ave Clairton 15025',
  '2701 Lincoln Ave Clairton 15025',
  '908 Saint Clair Clairton 15025 PA',
  '630 Park Ave Clairton 15025',
  '537 N Sixth StClairton 15025',
  '1206 Marion Circle',
  '316 Walnut AveClairton 15025',
  '638 Miller AveClairton 15025',
  '423 N 3rd St Clairton 15025',
  '701 Reed St Clairton 15025',
  '143 Waddell Ave Clairton 15025 PA',
  '104 Shany Dr Clairton 15025',
  '1706 Marian Circle 15025',
  '249 Shaw Ave',
  '349 Wylie AveClairton 15025',
  '1303 Marion Circle Clairton PA 15025',
  '413 Halcomb AveClairton 15025 AptClairton 15025 1',
  '873 Miller AveClairton 15025',
  '1204 Marion Circle',
  '333 Halcomb AveClairton 15025',
  '916 Miller AveClairton 15025(2)',
  '916 Miller AveClairton 15025',
  '240 Maple Ave  Clairton 15025',
  '810 Miller Ave Clairton 15025',
  '726 St Clairton 15025 ',
  '715 Large Ave Clairton 15025',
  '359 Wylie AveClairton 15025',
  '212 Waddell AveClairton 15025',
  '430 Wilson AveClairton 15025',
  '218 Baron AveClairton 15025',
  '463 Reed Street #1 Clairton 15025',
  '503 5th St Clairton 15025',
  '511 Ivy St Clairton 15025',
  '537 Third St  Clairton 15025',
  '541 3rd St Clairton 15025',
  '348 Spruce St Clairton 15025',
  '768 Van Kirk St Clairton 15025',
  '718 Reed StClairton 15025',
  '406 Chamber StClairton 15025',
  '341 Baker Ave',
  '605 Park Ave  Clairton 15025',
  '712 Miller AveClairton 15025',
  '7592 Fayette Dr Clairton 15025',
  '108 Carnegie AveClairton 15025',
  '824 Waddell AveClairton 15025',
  'Craig St Clairton 15025',
  '431 Large Ave Clairton 15025',
  '350 Wylie AveClairton 15025',
  '23 N 3rd StClairton 15025',
  '730 Horton St Clairton 15025',
  '634 Reed St',
  '1216 Worthington Ave Clairton 15025',
  '702 Wassell Ave  Clairton 15025',
  '908 Waddell AveClairton 15025',
  '522 N 6th StClairton 15025',
  '239 Boundary Ave Clairton 15025',
  '436 Wilson AveClairton 15025',
  '605 Ridge St Clairton 15025',
  '744 Horton St Clairton 15025',
  '201 Baron AveClairton 15025',
  '177 Mitchell AveClairton 15025',
  '533 Wylie Ave',
  '508 St Clair Ave  Clairton 15025',
  '528 Reed Street',
  '514 3rd St Clairton 15025',
  '537 Wilson Ave  Clairton 15025',
  '508 Ivy St Clairton 15025',
  '609 Large Ave Clairton 15025',
  '311 Waddell AveClairton 15025',
  '313 Waddell AveClairton 15025',
  '206 Mendelsohn Ave',
  '216 N 3rd StClairton 15025',
  '324 Baker Ave Clairton 15025',
  '753 Horton St Clairton 15025',
  '508 Farnsworth Ave Clairton 15025',
  '661 Reed St Clairton 15025',
  '708 Lafayette St Clairton 15025',
  '1540 Gilmore Drive',
  '2101 Polk Ave Clairton 15025',
  '231 Pennsylvania Ave Clairton 15025',
  '422 N 4th StClairton 15025',
  '518 N State StClairton 15025',
  '341 Wylie AveClairton 15025',
  '198 Baker AveClairton 15025',
  '430 Baker AveClairton 15025',
  '446 Mitchell AveClairton 15025',
  '905 School StClairton 15025',
  '919 Waddell AveClairton 15025',
  '829 Vankirk St',
  '519 Reed Street  Clairton 15025',
  '804 3rd St Clairton 15025',
  '565 Reed St Clairton 15025',
  '705 Reed St Clairton 15025',
  '448 3rd St Clairton 15025',
  '469 Reed St Clairton 15025',
  '448 3rd StcClairton 15025 Rear',
  '615 Carnegie Ave Clairton 15025',
  '439 Mitshell Ave Clairton 15025',
  '670 Reed St Clairton 15025',
  '739 St Clairton 15025 Clair Ave Clairton 15025',
  '520 Holcomb Ave Clairton 15025',
  '443 Large Ave Clairton 15025',
  '374 Ohio Ave Clairton 15025',
  '251 Shaw Ave Clairton 15025',
  '424 Caldwell St Clairton 15025',
  '179 Halcomb Ave Clairton 15025',
  '466 Wilson Ave Clairton 15025',
  '436 Wilson Ave Clairton 15025',
  '583 Shady Ct Clairton 15025',
  '141 Baker Ave Clairton 15025',
  '605 Independence Clairton 15025',
  '263 Mitchell Clairton 15025 PA',
  '230 Halcomb Ave Clairton 15025',
  '605 Large Ave Clairton 15025',
  '751 Van Kirk St Clairton 15025',
  '347 Wylie Ave Clairton 15025',
  '929 Gary Ave Clairton 15025',
  '697 Reed St Clairton 15025',
  '510 Farnsworth Ave  Clairton 15025',
  '673 Reed St Clairton 15025',
  '664 3rd St Clairton 15025',
  '427 Saint Clair Ave',
  '817 School StClairton 15025',
  '1205 Marion Circle',
  '902 Madison Ave Clairton 15025',
  '422 N 3rd Street Clairton 15025',
  '535 Large Ave Clairton 15025',
  '314 Mendelsohn Ave Clairton 15025',
  '106 N 4th St Clairton 15025',
  '863 Horton Ave Clairton 15025',
  '521 Farnsworth Ave Clairton 15025',
  '143 Waddell Ave Clairton 15025',
  '911 Waddell Ave Clairton 15025',
  '427 Park Ave Clairton 15025',
  '888 Miller Ave Clairton 15025',
  '532 9th St Clairton 15025',
  '773 Vankirk St 15025',
  '5698 3rd St Clairton 15025',
  '120 Shaw Ave, Clairton 15025',
  '726 Waddell Ave Clairton 15025',
  '601 N 6th Street  Clairton 15025',
  '465 3rd St Clairton 15025',
  '439 Wylie Ave Clairton 15025',
  '634 Farnsworth Ave Clairton 15025',
  // Additional purifier addresses from the extended list
  '715 Tamarack Drive Clairton 15025',
  '939 Vankirk Street 15025',
  '1509 Marion Circle 15025',
  '645 Waddell Ave 15025',
  '759 Lafayette Drive 15025',
  '413 Halcomb Ave 15025',
  '825 Vankirk Street 15025',
  '629 Thompson Ave 15025',
  '255 Mitchell Ave 15025',
  '1110 Marion Circle 15025',
  '312 Boundary Ave 15025',
  '708 Henry Street 15025',
  '863 School Street 15025',
  '277 Park Ave 15025',
  '201 Wylie Ave 15025',
  '333 Halcomb Ave 15025',
  '567 3rd Street 15025',
  '552 Constitution Circle 15025',
  '352 Wylie Ave 15025',
  '525 Wylie Ave 15025',
  '565 Reed Street Apt 203 15025',
  'Park Ave 15025',
  '314 Wilson Ave 15025',
  '544 Halcomb Ave 15025',
  '1711 Marion Circle 15025',
  '543 Reed Street 15025',
  '463 Third Street 15025',
  '543 Reed Street 15025',
  '635 Waddell Ave 15025',
  '1516 Worthington Ave 15025',
  '1030 Toman Ave 15025',
  '542 3rd Street  Clairton 15025',
  '404 Shaw Ave 15025',
  '744 Horton 15025',
  '514 3rd Street Clairton 15025',
  '425 Farnworth Ave 15025',
  '565 Reed Street 15025',
  '143 Waddell Ave 15025',
  '134 Kay Way 15025',
  '739 3rd Street Clairton 15025',
  '361 New York Ave 15025',
  '677 3rd Street 15025',
  '4971 Flamingo St Clairton 15025',
  '909 9th Street 15025',
  '815 School Street 15025',
  '512 Arch 15025',
  '753 Horton Street 15025',
  '716 St. Clair Ave 15025',
  '358 Wylie Ave 15025',
  '160 Spruce Street 15025',
  '235 Shaw Ave 15025',
  '742 St. Clair 15025',
  '434 Baker Ave 15025',
  '114 Francis Ave 15025',
  '413 Halcomb Ave 15025',
  '607 Miller Ave Apt 211 15025',
  '447 Reed Street 15025',
  '714 3rd Street 15025',
  '1706 Marion Circle 15025',
  '337 Shaw 15025',
  '928 Gary Ave 15025',
  '131 New York Ave 15025',
  '322 North 3rd Street 15025',
  '607 Miller Ave Apt 309 15025',
  '607 Miller Ave Apt 217 15025',
  '404 Shaw Ave 15025',
  '230 Halcomb Ave 15025',
  '337 Shaw Ave 15025',
  '817 School Street 15025',
  '767 Vankirk Street 15025',
  '532 Waddell Ave 15025',
  '232 North 3rd Street 15025',
  '547 Farnsworth Ave 15025',
  '1901 Polk Ave 15025',
  '924 Gary Ave 15025',
  '621 Park Ave 15025',
  '916 Toman Ave 15025',
  '824 Waddell Ave 15025',
  '552 Lafayette Drive 15025',
  '601 Park Ave 15025',
  '141 Balom Ave Clairton 15025',
  '404 Washington Ave 15025',
  '5606 Soltis Drive 15025',
  '1707 Marion Circle 15025',
  '629 Farnsworth Ave 15025',
  '446 Waddell Ave 15025',
  '1507 Marion Circle 15025',
  '607 Miller Ave Apt 207 15025',
  '510 St Clair 1st Floor Clairton 15025',
  '607 Miller Ave Apt 306 15025',
  '448 3rd Street Clairton 15025',
  '895 Desiderio Blvd 15025',
  '217 North 2nd Street 15025',
  '6708 McKinley Ct 15025',
  '1103 Mariam Cirlce Clairton 15025',
  '1410 Marion Circle 15025',
  '357 Mitchell Ave 15025',
  '911 St Clair Ave 15025',
  '510 Mitchell Ave 15025',
  '905 School St 15025',
  '501 Ivy Street 15025',
  '413 Halcomb Ave 15025',
  '605 Ridge Ave 15025',
  '605 Park Ave 15025',
  '1006 Toman Ave 15025',
  '747 Horton Ave 15025',
  '642 Large Ave 15025',
  '543 10th Street 15025',
  '1502 Marion Circle 15025',
  '233 Park Ave 15025',
  '6402 Solits Drive 15025',
  '917 St Clair Ave 15025',
  '565 Reed Street Apt 703 15025',
  '600 Waddell Ave 15025',
  '141 Ravine Ave 15025',
  '429 Caldwell Street 15025',
  'Jefferson Hills 15025',
  '629 Independence Drive 15025',
  '332 Halcomb Ave 15025',
  '104 Constitution Circle 15025',
  '361 Penna Ave 15025',
  '1039 Toman Ave 15025',
  '520 Mitchell Ave, Floor 1 15025',
  '213 3rd Street 15025',
  '949 Jefferson Ave 15025',
  '529 Wylie Ave 15025',
  '431 Large Ave 15025',
  '121 North 4th Street 15025',
  '2806 Soltis Drive 15025',
  '1107 Marion Circle 15025',
  '307 Large Ave 15025',
  '33 North 4th Street 15025',
  '318 North 3rd Street 15025',
  '113 Jefferson Drive 15025',
  '122 North 4th Street 15025',
  '634 Reed Street, Apt 3 15025',
  '1902 Polk Ave 15025',
  '1510 Marion Circle 15025',
  '530 Waddell Ave 15025',
  '642 Waddell Ave 15025',
  '128 North 4th Street 15025',
  '836 Vanark Street Clairton 15025',
  '706 3rd Street Clairton 15025',
  '190 Baker Ave 15025',
  '19 Baker Ave Clairton 15025',
  '553 Farnsworth Ave 15025',
  '1301 Madison Ave 15025',
  '547 Farnsworth Ave 15025',
  '1507 Marion Circle  Clairton 15025',
  '600 Waddell Ave 15025',
  '756 North 6th Street 15025',
  '1027 Pennsyina Ave 15025',
  '1307 Marion Cirlcle Clairton 15025',
  '544 Halcomb Ave 15025',
  '346 New York Ave 15025',
  '243 Massachusetts Ave 15025',
  '607 Miller Ave 15025',
  '2405 Lincoln Ave 15025',
  '127 Woddell Ave 15025',
  '315 North 5th Street 15025',
  '221 Halcomb Ave 15025',
  '889 Vankirk Street 15025',
  '443 6th Street 15025',
  '532 Waddell Ave 15025',
  '109 North 4th Street 15025',
  '700 Lafayette Drive 15025',
  '804 Waddell Ave 15025',
  '352 Wylie Ave 15025',
  '537 Halcomb Ave 15025',
  '322 St Clair Ave 15025',
  '726 Large Ave 15025',
  '527 Wilson Ave 15025',
  '719 Walnut Ave 15025',
  '138 Boundary Ave 15025',
  '145 Carnegie Ave 15025',
  '6801 Mckinley Ct 15025',
  '608 Independence Drive 15025',
  '423 Large Ave 15025',
  '628 Thompson Ave 15025',
  '863 School Street 15025',
  '453 Carnegie Ave 15025',
  '126 Jefferson Drive 15025',
  '361 Halcomb Ave Clairton 15025',
  '423 Miller Ave 15025',
  '1105 Gary Ave 15025',
  '612 Farnsworth Ave 15025',
  '251 Shaw Ave 15025',
  '804 3rd Street Clairton 15025',
  '705 Reed Street 15025',
  'PO Box 1 Clairton 15025',
  '311 Waddell Ave 15025',
  '313 Waddle Ave 15025',
  '123 Marion Ave Clairton 15025',
  '314 Waddle Ave 15025',
  '543 Reed Street 15025',
  '717 3rd Street 15025',
  '634 Farnsworth Ave 15025',
  '817 School Ave Clairton 15025',
  '333 Halcomb Ave 15025',
  '352 Mitchell Ave 15025',
  '502 Mitchell Ave 15025',
  '429 Carnegie Ave 15025',
  '219 Halcomb Ave 15025',
  '567 3rd Street 15025',
  '607 Miller Ave 15025',
  '419 3rd Street 15025',
  '863 Horne Street Clairton 15025',
  '230 Halcomb Ave 15025',
  '548 3rd Street Clairton 15025',
  '255 Mitchell Ave 15025',
  '411 Caldwell Ave 15025',
  '516 Park Ave 15025',
  '416 5th Street 15025',
  '120 Carnegie Ave 15025',
  '824 Miller Ave 15025',
  '752 North 6th Ct 15025',
  '714 3rd Street 15025',
  '215 Mendelssohn Ave Clairton 15025',
  '516 Thompson Ave 15025',
  '537 North 6th Street 15025',
  '824 Waddell Ave 15025',
  '431 Ohio Ave 15025',
  '539 N Lewis Rd  Clairton 15025',
  '3502 Miles Ave 15025',
  '565 Reed Street, Apt 411 15025',
  '1032 Toman Ave, 15025',
  '102 Carnegie Ave, 15025',
  '215 Mendelsom  Clairton 15025',
  '125 Jefferson Drive, 15025',
  '812 Waddell Ave, 15025',
  '1303 Marion Circle, 15025',
  '352 Lafayette Drive, 15025',
  '2101 Polk Ave, 15025',
  '621 Park Ave, 15025',
  '609 12th Street, 15025',
  '190 Baker Ave, 15025',
  '327 Penn Ave, 15025',
  '361 Halcomb Ave, 15025',
  '5606 Soltis Drive, 15025',
  '712 Marian Circle Clairton 15025',
  '200 Walnut Ave, 15025',
  '2040 Wolosyn Circle Apt 6  Clairton 15025',
  '929 Gary Ave, 15025',
  '605 Ridge, 15025',
  '190 Baker Ave, 15025',
  '197 Baker Ave, 15025',
  '605 Park Ave, 15025',
  '190 Baker Ave, 15025',
  'St Clair Ave, 15025',
  '209 Park Ave, 15025',
  '114 Francis Ave, 15025',
  '411 Mitchell Ave, 15025',
  '537 Wilson Ave, 15025',
  '535 Wilson Ave, 15025',
  '233 Halcomb Ave, 15025',
  '1506 Marion Circle, 15025',
  '419 Wylie Ave,15025',
  '1506 Marion Circle, 15025',
  '317 Shaw Ave, 15025',
  '607 Miller Ave, 15025',
  '196 Baker Ave, 15025',
  '213 Halcomb Ave, 15025',
  '6404 Soltis Drive, 15025',
  '215 Halcomb, 15025',
  '607 Miller Ave, 15025',
  '251 Shaw Ave, 15025',
  '352 Mitchell Ave, 15025',
  '465 3rd Street  Clairton 15025',
  '808 Waddell Ave, 15025',
  '511 Ivy Street, 15025',
  '120 Show Ave, 15025',
  '190 Bake Ave Clairton 15025',
  '833 Earl Street, Clairton 15025',
  '314 Wall Road, Clairton 15025',
  '411 Halcomb Ave, Clairton 15025',
  '702 Reed Street, Clairton 15025',
  '607 Miller Ave, Clairton 15025',
  '662 3rd Street, Clairton 15025',
  '433 Carnegie Ave, Clairton 15025',
  '443 6th Street, Clairton 15025',
  '116 Village Clairton 15025',
  '634 Farnsworth, Clairton 15025',
  '516 North 7th Street, Clairton 15025',
  '427 Park Ave, Clairton 15025',
  '420 Wilson Ave, Clairton 15025',
  '288 Ohio Ave, Clairton 15025',
  '675 6th St, Clairton 15025',
  '257 Mitchell Ave, Clairton 15025',
  '277 Shaw Ave, Clairton 15025',
  '351 Shaw Ave, Clairton 15025',
  '239 Park Ave, Clairton 15025',
  '333 Mitchell Ave, Clairton 15025',
  '815 Miller Ave, Clairton 15025',
  '661 Reed Street, Clairton 15025',
  '871 Vankirk St, Clairton 15025',
  '411 N 4th Street, Clairton 15025',
  '1516 Worthington Ave, Clairton 15025',
  '267 Shaw Ave, Clairton 15025',
  '212 Crest St, Clairton 15025',
  '1512 3rd St, Clairton 15025',
  '436 Wilson Ave, Clairton 15025',
  '607 Miller Ave Apt 302, Clairton 15025',
  '411 Baker Ave, Clairton 15025',
  '352 Wylie Ave, Clairton 15025',
  '192 Baker Ave, Clairton 15025',
  '707 Washington Ave, Clairton 15025',
  '348 Mitchell Ave, Clairton 15025',
  '514 Waldel Ave Clairton 15025',
  '226 Crest St, Clairton 15025',
  '1307 Marion Cirlce, Clairton 15025',
  '808 School St, Clairton 15025',
  '622 Park Ave, Clairton 15025',
  '524 Mitchell Ave, Clairton 15025',
  '634 Farnsworth Ave, Clairton 15025',
  '192 Baker Ave, Clairton 15025',
  '190 Baker Ave, Clairton 15025',
  '430 Wilson Ave, Clairton 15025',
  '426 Wilson Ave, Clairto 15025',
  '1211 Marion Cirlce, Clairton 15025',
  '447 Reed Street, Clairton 15025',
  '423 N 4th Street, Clairton 15025',
  '924 Gary Ave, Clairton 15025',
  '757 Layfette Ave, Clairton 15025',
  '443 6th Street, Clairton 15025',
  '430 Wylie Ave, Clairton 15025',
  '737 Large Ave, Clairton 15025',
  '1717 Jenny Lind',
  '730 Horton St, Clairton 15025',
  '715 St Clair Ave, Clairton 15025',
  '560 3rd St, Clairton 15025',
  '607 Miller Ave, Clairton 15025',
  '509 Ivy St, Clairton 15025',
  '565 Reed St Apt 411, Clairton 15025',
  '1003 Madison Ave, Clairton 15025',
  '565 Reed St, Clairton 15025',
  '513 Miller Ave, Clairton 15025',
  '2802 Soltis Dr, Clairton 15025',
  '416 Miller Ave, Clairton 15025',
  '642 Large Ave, Clairton 15025',
  '1116 N 6th St, Clairton 15025',
  'Caview Hall, Clairton 15025',
  '513 Miller Ave, Clairton 15025',
  '525 Wylie Ave, Clairton 15025',
  '6302 Soltis Drive, Clairton 15025',
  '619 Waddell Ave, Clairton 15025',
  '2801 Soltis Dr, Clairton 15025',
  '429 Carnegie Ave, Clairton 15025',
  '190 Babel Ave, Clairton 15025',
  '545 Reed St, Clairton 15025',
  '634 Farnsworth Ave, Clairton 15025',
  '2101 Park Ave, Clairton 15025',
  '810 Miller Ave, Clairton 15025',
  '425 Farnsworth Ave, Clairton 15025',
  '535 Reed St, Clairton 15025',
  '428 Caldwell St, Clairton 15025',
  '908 Waddell Ave, Clairton 15025',
  '319 St Clair Ave, Clairton 15025',
  '734 School St, Clairton 15025',
  '407 Division Ave, Clairton 15025',
  '525 Reed St, Clairton 15025',
  '764 Vankirk St, Clairton 15025',
  '560 3rd St, Clairton 15025',
  'Clairton 15025',
  '508 St Clair Ave, Clairton 15025',
  '974 Halcomb Ave, 15025',
  '505 Reed St, Clairton 15025',
  '543 Reed St, Clairton 15025',
  '548 3rd St, Clairton 15025',
  '363 Halcomb Ave, Clairton 15025',
  '864 Miller Ave, Clairton 15025',
  '905 School St, Clairton 15025',
  '514 3rd St, Clairton 15025',
  '544 3rd St Clairton 15025',
  '409 Caldwell St, Clairton 15025',
  '239 Boundary Ave, Clairton 15025',
  '565 Reed St, Clairton 15025',
  '635 Waddell Ave, Clairton 15025',
  '622 Park Ave, Clairton 15025',
  '524 Mitchell Ave, Clairton 15025',
  '448 3rd St, Clairton 15025',
  '607 Miller Ave, Clairton 15025',
  '565 Reed Street, Clairton 15025',
  '565 Reed Street, Clairton 15025',
  '1025 6th N, Clairton 15025',
  '215 Halcomb Ave, Clairton 15025',
  '607 Miller Ave, Clairton 15025',
  '1210 Worthington Ave, Clairton 15025',
  '206 Crest St, Clairton 15025',
  '421 Caldwell St, Clairton 15025',
  '607 Miller Ave, Clairton 15025',
  '411 N 7th St, Clairton 15025',
  '232 Halcomb Ave, Clairton 15025',
  '311 Wadell Ave, Clairton 15025',
  '526 Ohio Ave, Clairton 15025',
  '1106 Marion Circle, Clairton 15025',
  '541 Wilson Ave, Clairton 15025',
  '704 Washington Ave, Clairton 15025',
  '540 Halcomb Ave, Clairton 15025',
  '605 Large Ave, Clairton 15025',
];

/**
 * Parse address string to extract components
 */
function parseAddress(addressStr: string): { street: string; city: string; zipCode: string } {
  // Clean up the address string
  const cleaned = addressStr.trim();
  
  // Extract zip code (5 digits)
  const zipMatch = cleaned.match(/(\d{5})/);
  const zipCode = zipMatch ? zipMatch[1] : '';
  
  // Extract city (usually before zip code, or "Clairton", "McKeesport", etc.)
  let city = '';
  if (cleaned.includes('Clairton')) {
    city = 'Clairton';
  } else if (cleaned.includes('McKeesport') || cleaned.match(/15(132|133)/)) {
    city = 'McKeesport';
  } else if (cleaned.includes('Monongahela') || cleaned.match(/15045/)) {
    city = 'Monongahela';
  } else {
    city = 'Mon Valley';
  }
  
  // Extract street address (everything before city/zip)
  const street = cleaned.replace(/\s*(Clairton|McKeesport|Monongahela|Mon Valley).*/, '').trim();
  
  return { street, city, zipCode };
}

/**
 * Get all VCAN distribution locations with hardcoded coordinates
 * Coordinates are loaded from vcanDistributionCoordinates.ts to avoid API costs
 * Falls back to approximate zip code coordinates if hardcoded coordinates are not available
 */
export function getVCANDistributionLocations(): VCANDistributionLocation[] {
  const locations: VCANDistributionLocation[] = [];
  
  // Check if we have any hardcoded coordinates
  const hasHardcodedCoords = Object.keys(AIR_FILTER_COORDINATES).length > 0 || Object.keys(AIR_PURIFIER_COORDINATES).length > 0;
  
  // Zip code centers for fallback (approximate locations)
  const zipCodeCenters: { [key: string]: { lat: number; lng: number } } = {
    '15133': { lat: 40.35, lng: -79.85 }, // McKeesport
    '15132': { lat: 40.35, lng: -79.85 }, // McKeesport
    '15045': { lat: 40.20, lng: -79.92 }, // Monongahela
    '15025': { lat: 40.30, lng: -79.88 }, // Clairton
    '15205': { lat: 40.45, lng: -80.05 }, // Pittsburgh
  };
  
  // Helper function to get coordinates (hardcoded or fallback)
  const getCoordinates = (address: string, city: string, zipCode: string, deviceType: 'filter' | 'purifier', index: number): { lat: number; lng: number } | undefined => {
    const addressKey = `${address}, ${city}, ${zipCode}`;
    
    // Try hardcoded coordinates first
    const hardcodedCoords = deviceType === 'filter' 
      ? AIR_FILTER_COORDINATES[addressKey]
      : AIR_PURIFIER_COORDINATES[addressKey];
    
    if (hardcodedCoords) {
      return hardcodedCoords;
    }
    
    // Fallback to approximate zip code coordinates if no hardcoded coords available
    // Always use fallback if no hardcoded coords exist (so markers show up immediately)
    if (!hasHardcodedCoords) {
      const center = zipCode ? (zipCodeCenters[zipCode] || { lat: 40.30, lng: -79.88 }) : { lat: 40.30, lng: -79.88 }; // Default to Clairton
      // Add deterministic offset based on index to spread markers out
      const offsetLat = (Math.sin(index * 0.5) * 0.015) + (Math.cos(index * 0.3) * 0.01);
      const offsetLng = (Math.cos(index * 0.7) * 0.015) + (Math.sin(index * 0.4) * 0.01);
      return {
        lat: center.lat + offsetLat,
        lng: center.lng + offsetLng,
      };
    }
    
    return undefined;
  };
  
  // Process air filter addresses
  AIR_FILTER_ADDRESSES.forEach((address, index) => {
    const parsed = parseAddress(address);
    // Ensure we have a zip code for fallback
    if (!parsed.zipCode && address.match(/\d{5}/)) {
      const zipMatch = address.match(/(\d{5})/);
      parsed.zipCode = zipMatch ? zipMatch[1] : '';
    }
    
    const coordinates = getCoordinates(parsed.street || address, parsed.city, parsed.zipCode, 'filter', index);
    
    if (coordinates) {
      locations.push({
        id: `vcan-filter-${index}`,
        address: parsed.street || address,
        zipCode: parsed.zipCode || '15025', // Default to Clairton if no zip
        city: parsed.city || 'Clairton',
        deviceType: 'filter',
        location: coordinates,
      });
    } else {
      console.warn(`⚠️ No coordinates for filter address: ${address}`);
    }
  });
  
  // Process air purifier addresses
  AIR_PURIFIER_ADDRESSES.forEach((address, index) => {
    const parsed = parseAddress(address);
    // Ensure we have a zip code for fallback
    if (!parsed.zipCode && address.match(/\d{5}/)) {
      const zipMatch = address.match(/(\d{5})/);
      parsed.zipCode = zipMatch ? zipMatch[1] : '';
    }
    
    const coordinates = getCoordinates(parsed.street || address, parsed.city, parsed.zipCode, 'purifier', index + AIR_FILTER_ADDRESSES.length);
    
    if (coordinates) {
      locations.push({
        id: `vcan-purifier-${index}`,
        address: parsed.street || address,
        zipCode: parsed.zipCode || '15025', // Default to Clairton if no zip
        city: parsed.city || 'Clairton',
        deviceType: 'purifier',
        location: coordinates,
      });
    } else {
      console.warn(`⚠️ No coordinates for purifier address: ${address}`);
    }
  });
  
  console.log(`📍 VCAN Distribution: Loaded ${locations.length} locations (${AIR_FILTER_ADDRESSES.length} filters + ${AIR_PURIFIER_ADDRESSES.length} purifiers)`);
  return locations;
}

/**
 * Geocode an address using Mapbox Geocoding API
 */
export async function geocodeAddress(
  address: string, 
  city: string, 
  zipCode: string,
  mapboxToken?: string
): Promise<{ lat: number; lng: number } | null> {
  if (!mapboxToken) {
    console.warn('Mapbox token not provided for geocoding');
    return null;
  }

  try {
    // Construct full address string
    const fullAddress = `${address}, ${city}, PA ${zipCode}, USA`;
    
    // Use Mapbox Geocoding API
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${mapboxToken}&limit=1&country=us&proximity=-79.88,40.30`
    );

    if (!response.ok) {
      console.error(`Geocoding failed for ${fullAddress}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lat, lng };
    }
    
    console.warn(`No results found for ${fullAddress}`);
    return null;
  } catch (error: any) {
    console.error(`Error geocoding ${address}:`, error.message);
    return null;
  }
}

/**
 * Batch geocode all addresses
 * This should be run once to populate coordinates, then coordinates can be stored in the service
 */
export async function batchGeocodeAddresses(
  addresses: string[],
  mapboxToken: string,
  deviceType: 'filter' | 'purifier'
): Promise<Array<{ address: string; location: { lat: number; lng: number } | null }>> {
  const results: Array<{ address: string; location: { lat: number; lng: number } | null }> = [];
  
  // Parse addresses and geocode with delays to respect rate limits
  for (let i = 0; i < addresses.length; i++) {
    const addressStr = addresses[i];
    const parsed = parseAddress(addressStr);
    
    console.log(`Geocoding ${i + 1}/${addresses.length}: ${addressStr}`);
    
    const location = await geocodeAddress(parsed.street || addressStr, parsed.city, parsed.zipCode, mapboxToken);
    results.push({ address: addressStr, location });
    
    // Add delay to respect rate limits (Mapbox allows 600 requests/minute)
    if (i < addresses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay = ~600 requests/minute max
    }
  }
  
  return results;
}

