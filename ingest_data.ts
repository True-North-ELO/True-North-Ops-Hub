
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const adminApp = getApps().length === 0 
  ? initializeApp({ projectId: firebaseConfig.projectId }) 
  : getApps()[0];

const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
db.settings({ ignoreUndefinedProperties: true });

const rcmFiles = [
  {
    id: 'tn-brightstar-providers',
    name: 'TN BrightStar Providers.csv',
    type: 'csv',
    content: `Location Name,Database ID,Service Tier,Service Offering Defintion (User Defined),CSM,Invoice Creation,Has Exceptions,Legal Name,Address,City,State,ZIP,Tax ID,NPI,Last Audit Date,Next Audit Due Date
AK - Anchorage,AKACH,VA Only,,,N,N,Serendipity Care Services LLC,11901 Business Blvd. Suite 1-2,Eagle River,AK,99577,842999436,1205467735,Never Verified,5/17/2026
AL - Birmingham,ALBIR,Enterprise RCM,"Excluding VIVA Schools, LUXOR Schools, Cooper Green Mercy Health",Trish Wolfe,Y,Y,Health Choice Enterprises Inc.,4 Office Park Circle Suite 309,Birmingham,AL,35223,261531129,1689824385,Never Verified,5/17/2026
AR - Little Rock,ARLTR,Enterprise RCM,,Ashley Reynolds,Y,N,BT Sliger LLC,3800 N Rodney Parham Road Suite 202,Little Rock,AR,72212,883348957,1114633344,Never Verified,5/17/2026
AZ - Phoenix NW/NE,AZPHX,Enterprise RCM,,Brittney Power,Y,N,TLK Management Corp,4515 S. McClintock Drive Suite 203,Phoenix,AZ,85282,471890949,1376036038,Never Verified,5/17/2026
AZ - Tucson,AZTUS,Enterprise RCM,,Brittney Power,Y,N,Nurses Nook Inc.,4024 E. La Linda Way,Sierra Vista,AZ,85635,262629869,1265696355,Never Verified,5/17/2026
CA - Anaheim-Yorba Linda,CAANH,Standard RCM,,Trish Wolfe,N,N,CNST Health Care,1440 N. Harbor Blvd. Suite 307B,Fullerton,CA,92835,934316699,1891536736,4/17/2026,7/16/2026
CA - Carlsbad,CACBD,VA Only,,,N,N,Dusie Corporation,5962 La Place Court Suite 195,Carlsbad,CA,92008-8807,834100534,1891352217,Never Verified,5/17/2026
CA - Central Western Riverside Co.,CACWR,VA Only,,,N,N,24-7 Higher Standard Corporation,29737 New Hub Drive Suite 101,Menifee,CA,92586-6529,471363382,1154591618,Never Verified,5/17/2026
CA - Coronado,CAENC,Selective RCM,Including PEAK TPA,Ashley Reynolds,N,Y,Sumad LLC,"680 Fletcher Parkway Suite, #206",El Cajon,CA,92020,471358669,1700295185,Never Verified,5/17/2026
CA - East Los Gatos,CAELG,RCM Startup,Excluding Private Pay,Bethany Christen,N,Y,South Valley Health LLC,4820 Harwood Road Suite 100,San Jose,CA,95124,332996697,1790652519,Never Verified,5/17/2026
CA - Fairfield,CAFAI,RCM Startup,,Trish Wolfe,N,N,Blackhawk Premier Care Inc.,5140 Business Center Drive Suite 210,Fairfield,CA,94534,334515970,1104715358,Never Verified,5/17/2026
CA - Hayward/Fremont,CAHAY,RCM Startup,,Ashley Reynolds,N,N,Irie Home Care LLC,22320 Foothill Blvd. Suite 130,Hayward,CA,94541,994840082,1275325540,Never Verified,5/17/2026
CA - Lake Elsinore,CATEM,VA Only,,,N,N,TKA LLC,29970 Technology Drive Suite 120,Murrieta,CA,92563,331742610,1699574210,Never Verified,5/17/2026
CA - N Central San Diego,CANCS,RCM Startup,,Bethany Christen,N,N,King Home Care Corporation,9939 Hilbert Street Suite 203,San Diego,CA,92131,333402080,1427844117,Never Verified,5/17/2026
CA - South Sacramento,CASSA,Enterprise RCM,,Trish Wolfe,Y,N,EZ Care,1104 Corporate Way,Sacramento,CA,95831,320683150,1780329771,Never Verified,5/17/2026
CO - Colorado Springs,COCOS,Enterprise RCM,,Ashley Reynolds,Y,N,Rockport Partners LLC,3730 Sinton Road Suite 200,Colorado Springs,CO,80907,854145061,1457941742,Never Verified,5/17/2026
CO - Greeley,COGRE,National Accounts,"Including Workers Comp, CareScout LTC",Ashley Reynolds,N,Y,Salveo Medical Group Inc.,918 13th Street Suite 1,Greeley,CO,80631,834432097,1336706704,Never Verified,5/17/2026
DC - Washington,DCWAS,Standard RCM,,Amy Cashdollar,N,N,Sweet Virginia Care DC LLC,5247 Wisconsin Avenue Suite 3B,Washington,DC,20015,922053315,1295145456,Never Verified,5/17/2026
FL - Coral Gables,FLCOG,Selective RCM,"Including Cigna, Medicaid",,Y,Y,Savia Health LLC,2828 Coral Way Suite 106,Miami,FL,33145,851743166,1811508526,Never Verified,5/17/2026
FL - Delray Beach,FLRAY,VA Only,"Including Cigna, Medicaid",Autumn Carnegie,N,Y,Healthcare Interventions Inc.,"5300 W. Atlantic Avenue, Suite 501",Delray Beach,FL,33484,651315592,1326226903,Never Verified,5/17/2026
FL - Doral,FLDOR,Selective RCM,Including Cigna,Trish Wolfe,Y,Y,Doral Healthcare Solutions LLC,7791 NW 46th Street unit 123,Doral,FL,33166,922296518,1194423798,Never Verified,5/17/2026
FL - Jupiter/Martin County,FLJPT,Standard RCM,,Amy Cashdollar,N,N,PRSM Solutions LLC,930 W Indiantown Road Suite 203,Jupiter,FL,33458,844567352,1386251718,Never Verified,5/17/2026
FL - Kissimmee/Osceola,FLKSM,National Accounts,"Excluding Purple Heart, Option Care, Symphony, Embrace Family, Advent Health",Amy Cashdollar,N,Y,Fairview Avenue LLC,3270 Suntree Blvd. Suite 101,Melbourne,FL,32940,320591269,1386101368,Never Verified,5/17/2026
FL - Lakeland,FLLKL,RCM Startup,,,N,N,Care 4 Future LLC,20 Lake Wire Drive Suite 187,Lakeland,FL,33815,334458629,1679362800,Never Verified,5/17/2026
FL - North Miami,FLNOM,VA Only,Including Cigna,,N,Y,Guiding Star Home Health LLC,11077 Biscayne Blvd. Suite 304,North Miami,FL,33161,841798631,1285283812,Never Verified,5/17/2026
FL - North Sarasota,FLNSA,VA Only,,,N,N,S&J Healthcare LLC,6891 Curtiss Avenue Suite 7,Sarasota,FL,34231,275255444,1710279567,Never Verified,5/17/2026
FL - Pembroke Pines,FLPPW,Selective RCM,Including Cigna,,N,Y,WHOLE CARE SOLUTIONS LLC,7951 Riviera Blvd. Suite 103,Miramar,FL,33023,845094451,1003434770,Never Verified,5/17/2026
FL - Pompano Beach East,FLFLD,Enterprise RCM,,Ashley Reynolds,Y,N,BTPM Healthcare LLC,1280 SW 36th Avenue Suite 200,Pompano Beach,FL,33069,452547946,1790064806,Never Verified,5/17/2026
FL - Ponte Vedra/West Jacksonville,FLPTV,Enterprise RCM,,Trish Wolfe,Y,N,Grahams Promise LLC,7563 Philips Hwy Building 300 Suite 304,Jacksonville,FL,32256,991189766,1356166847,Never Verified,5/17/2026
FL - Spring Hill-Citrus Springs,FLSPH,VA Only,,,Y,N,Miraid LLC,1275 Kass Circle,Spring Hill,FL,34606,844219555,1346872777,Never Verified,5/17/2026
FL - Venice,FLVCE,VA Only,,,N,N,Allheart Healthcare Inc.,12626 Bay Pointe Ter,Cortez,FL,34215-2565,473811094,1851768147,Never Verified,5/17/2026
GA - Locust Grove,GALCG,RCM Startup,,,N,N,Legacy Wellness Group Inc,Legacy Wellness Group Inc,McDonough,GA,30253,393559557,1063389815,Never Verified,5/17/2026
GA - North Dekalb,GANDK,RCM Startup,,Trish Wolfe,N,N,Babkay Homecare Services LLC,2799 Lawrenceville HighWay Suite 102,Decatur,GA,30033,992350525,1538976709,Never Verified,5/17/2026
GA - SW Atlanta/College Park,GASWA,RCM Startup,,Bethany Christen,N,N,Fulton Strategic Resources Inc.,1708 Peachtree Street Suite 201,Atlanta,GA,30309,394119457,1245196997,Never Verified,5/17/2026
ID - Boise,IDBOI,VA Only,,,Y,N,Bright Blooms LLC,4355 W. Emerald Street Suite 290,Boise,ID,83706,272596287,1073828828,Never Verified,5/17/2026
IL - Barrington and McHenry County,ILHEN,Enterprise RCM,,Ashley Reynolds,Y,N,K&B Lifecare Inc.,755 McArdle Drive Unit G,Crystal Lake,IL,60014,270601163,1568793776,Never Verified,5/17/2026
IL - Central Dupage-Wheaton,ILCTD,VA Only,,,N,N,JDF Services Inc.,416 E. Roosevelt Road Suite 105,Wheaton,IL,60187,263890114,1992173249,Never Verified,5/17/2026
IL - Pullman/Calumet City,ILCAL,RCM Startup,,Ashley Reynolds,N,N,Kat Health LLC,11212 S. Western Avenue Suite 2,Chicago,IL,60643,993223426,1881436681,Never Verified,5/17/2026
IL - Tinley Park,ILTNL,National Accounts,Excluding VA,Bethany Christen,N,Y,MSM Home Healthcare Solutions Inc.,7601 W 191st Street,Tinley Park,IL,60487,473502932,1942683289,Never Verified,5/17/2026
IN - Fort Wayne,INFOW,Enterprise RCM,,Amy Cashdollar,Y,N,Zeedub LLC,333 E Washington Blvd.,Fort Wayne,IN,46802,991742570,1033967807,Never Verified,5/17/2026
IN - Hamilton County,INHAM,Standard RCM,,Brittney Power,Y,N,Alta Health Care Inc.,9102 N Meridian St Suite 100,Indianapolis,IN,46260,922454437,1316640972,Never Verified,5/17/2026
KY - North Lexington,KYNLX,Standard RCM,,Trish Wolfe,Y,N,Invictus Healthcare Network PLLC,301 East Main Street Suite 110,Lexington,KY,40507,932864615,1811761075,Never Verified,5/17/2026
KY - Northern Kentucky,KYFLO,VA Only,,,N,N,LCA Group LLC,2734 Chancellor Drive Suite 207,Crewview Hills,KY,41017,474866342,1437516671,Never Verified,5/17/2026
MA - Lexington/Concord/Bedford,MALXT,RCM Startup,,Trish Wolfe,N,N,Apna Ventures LLC,318 Bear Hill Road Suite 1A,Waltham,MA,2451,331258192,1720872047,Never Verified,5/17/2026
MA - Newton,MANEW,RCM Startup,,Brittney Power,N,N,Care with Dignity LLC,21A Highland Circle,Needham,MA,2494,392266396,1700775814,Never Verified,5/17/2026
MD - Baltimore City/County,MDBTM,Selective RCM,,Brittney Power,N,N,3P Health,6 North Park Drive Suite 110,Cockeysville,MD,21030,833438859,1023571353,Never Verified,5/17/2026
MD - Bethesda,MDBTH,National Accounts,"Excluding Bright Horizons, Life Care",Amy Cashdollar,N,Y,Sweet Virginia Care of Montgomery,10400 Connecticut Avenue Suite 512,Kenisington,MD,20895,921188897,1942914650,Never Verified,5/17/2026
MD - Carroll and Frederick County,MDCFK,Standard RCM,Excluding Staffing,Trish Wolfe,N,Y,Care With Compassion Inc.,198 Thomas Johnson Drive Suite 19,Fredericksburg,MD,21702,851537001,1871190025,Never Verified,5/17/2026
MI - Birmingham,MIBLO,Standard RCM,Excluding Jewish Family Services,Ashley Reynolds,N,Y,EW Home Care Corp,44004 Woodward Avenue #100,Bloomfield Twp,MI,48302,813774170,1942826805,Never Verified,5/17/2026
MI - Carleton/Canton,MICAR,RCM Startup,,Bethany Christen,N,N,Above and Beyond Care Solutions LLC,35160 E. Michigan Avenue,Wayne,MI,48184,334083527,1982570040,Never Verified,5/17/2026
MI - East Lansing,MIESL,Enterprise RCM,,Amy Cashdollar,Y,N,Miller Home Care Services Inc.,2510 Kerry Street Suite 108,Lansing,MI,48912,474248862,1992173249,Never Verified,5/17/2026
MI - N. Grand Rapids & Rockford,MIGRR,RCM Startup,,Bethany Christen,N,N,Fountain Health Group LLC,2355 Rolling Meadow Drive NE,Belmont,MI,49306,395057275,1053262352,Never Verified,5/17/2026
MI - Northern Michigan,MITRA,Enterprise RCM,,Trish Wolfe,Y,N,St. Ann Corporation,3191 Logan Valley Road,Traverse City,MI,49686,270628658,1881922672,Never Verified,5/17/2026
MN - Maple Grove/Andover,MNMGA,National Accounts,,Mia Fairclough,N,N,Northwest Compassionate Care LLC,6240 Quinwood Lane North,Maple Grove,MN,55369,881255703,1689309585,Never Verified,5/17/2026
MN - Plymouth,MNPLY,VA Only,,,N,N,Prisendorf Care LLC,"3131 Fernbrook Lane, N Suite 105",Plymouth,MN,55447,831662135,1346713682,Never Verified,5/17/2026
MN - Scott and Carver Counties,MNSCC,VA Only,,,N,N,NLM Investment Group LLC,7460 South Park Drive,Savage,MN,55378,832250086,1083271662,Never Verified,5/17/2026
MN - St. Croix Valley,MNBUR,Selective RCM,Including Cigna,,N,Y,Swedehill Lifecare LLC,8951 33rd Street North,Lake Elmo,MN,55042,273870747,1760781314,Never Verified,5/17/2026
MN - St. Paul,MNSPA,VA Only,,,Y,N,Karing Hent Inc.,3666 E. County Line N,White Bear Lake,MN,55110,820732528,1669994141,Never Verified,5/17/2026
MO - MidMissouri,MOCOL,Enterprise RCM,,Trish Wolfe,Y,N,Innovative Healthcare of Mid Missouri Inc.,200 S. Keene Street Suite A,Columbia,MO,65201,463584483,1376964957,Never Verified,5/17/2026
MO - West St. Louis County,MOWSC,Enterprise RCM,,Trish Wolfe,Y,N,Vobis Sanus LLC,655 Craig Road Suite 120,Creve Coeur,MO,63141,454048495,1912260548,Never Verified,5/17/2026
NC - Asheville,NCASV,National Accounts,,Trish Wolfe,N,N,Rhonal Inc.,1340F Patton Avenue,Asheville,NC,28806,463683606,1710318712,Never Verified,5/17/2026
NC - Cary,NCCAR,Enterprise RCM,,Trish Wolfe,Y,N,Mayberry Vested Interests Inc.,160 Dundee Road,Pinehurst,NC,28374-9119,832509759,1093289506,Never Verified,5/17/2026
NC - Northern Charlotte/Huntersville,NCCRD,National Accounts,,Bethany Christen,N,N,Black Wolf Health North Charlotte LLC,10210 Hickorywood Hill Avenue Suite 230,Huntersville,NC,28078,462559790,1528493962,Never Verified,5/17/2026
NC - S. Charlotte,NCCLL,Enterprise RCM,,Ashley Reynolds,Y,N,Seva Healthcare LLC,1900 Abbott Street Suite 101,Charlotte,NC,28203,274430472,1962791715,Never Verified,5/17/2026
NC - S. Greensboro,NCGRO,Enterprise RCM,,Ashley Reynolds,Y,N,Starcevich Family Holdings LLC,508 Prescott Street Suite A,Greensboro,NC,27401,851084639,1437776713,Never Verified,5/17/2026
NC - Wilmington/Brunswick,NCWBR,National Accounts,Including Carescout LTC,Ashley Reynolds,N,Y,Eagle Island Group LLC,1818 Tennyson Court,Greensboro,NC,27410-2430,853390812,1912509522,Never Verified,5/17/2026
NE - Omaha,NEOMH,Standard RCM,,Ashley Reynolds,N,N,Major Home Health LLC,9202 West Dodge Road,Omaha,NE,68114,934304697,1891566956,Never Verified,5/17/2026
NH - Bedford/Manchester,NHMAN,VA Only,Including Commonwealth Care Alliance (CCA),,N,Y,GM Home Care Inc.,601 Riverway Place,Beford,NH,3110,475025176,1942669486,Never Verified,5/17/2026
NJ - Hunterdon,NJHUN,Enterprise RCM,,Brittney Power,Y,N,Balanced Life Home Care Services LLC,65 Old Highway 22 Suite 4,Clinton,NJ,8809,833838987,1619520780,Never Verified,5/17/2026
NJ - Morris County,NJSMC,VA Only,,,N,N,Soloff LLC,14 Ridgedale Avenue Suite 208,Cedar Knolls,NJ,7927,474925659,1225402126,Never Verified,5/17/2026
NJ - Mount Laurel,NJMLR,RCM Startup,,Trish Wolfe,N,N,Pawpaw Tree LLC,505 Lenola Road 132,Moorestown,NJ,8057,332966517,1982598900,Never Verified,5/17/2026
NJ - N Middlesex County,NJMDS,VA Only,"Including Cigna, Medicaid, NYSIF",,Y,Y,CT Home Healthcare Inc.,242 Old New Brunswick Road Suite 101,Piscataway,NJ,8854,882957842,1811615651,Never Verified,5/17/2026
NJ - Westfield,NJUNI,Enterprise RCM,,Brittney Power,Y,N,Garden State Health Colutions LLC,560 Springfield Avenue 2nd Floor Suite G,Westfield,NJ,7090,465189416,1790197713,Never Verified,5/17/2026
OH - Centerville/South Dayton,OHCTV,Enterprise RCM,,Trish Wolfe,Y,N,The DDC Group Inc.,10536 Success Lane,Centerville,OH,45458,264830595,1316273121,Never Verified,5/17/2026
OH - Cuyahoga West,OHCUY,Standard RCM,Excluding Staffing,Trish Wolfe,Y,Y,Bartino NEO Co.,7029 Pearl Road Suite 310,Middleburg Heights,OH,44130,844830211,1780206516,Never Verified,5/17/2026
OH - Hudson-Solon,OHSTO,Standard RCM,,Ashley Reynolds,N,N,Integrity Home Healthcare of Hudson LLC,9261 Ravennna Road Suite B-4,Twinsburg,OH,44087,811516690,1598211559,Never Verified,5/17/2026
OR - Lane County,OREUG,VA Only,,,Y,N,JENE Venture LLC,911 Country Club Road Suite 340,Eugene,OR,97401,465125336,1437521085,Never Verified,5/17/2026
PA - Bethlehem/Easton,PABET,VA Only,Including Medicaid,,N,Y,Long Quality Care LLC,118 E. Broad Street,Bethlehem,PA,18018,453309368,1104197185,Never Verified,5/17/2026
PA - City Center,PACCT,VA Only,Including Cigna,,N,Y,Oal Holdings & Ventures LLC,1528 Walnut Street Suite 1005,Philadelphia,PA,19102,853688905,1316601289,Never Verified,5/17/2026
PA - Greater Chester County,PAGCC,National Accounts,,Ashley Reynolds,N,N,Bobeva INC,3 N Five Points Road,West Chester,PA,19380,844130843,1063038438,Never Verified,5/17/2026
PA - North Hills-Pittsburgh,PANOH,Selective RCM,Including Medicaid,,N,Y,Pittsburgh Home Heatlhcare Inc.,5000 McKnight Road Suite 200,Pittsburgh,PA,15237,453795369,1497015044,Never Verified,5/17/2026
PA - S. Bucks County,PABCS,National Accounts,"Including Workers Comp, CareScout LTC",Trish Wolfe,Y,Y,Immensus Auxilium LLC,1950 Street Road Suite 315,Bensalem,PA,19020,812647147,1376255026,Never Verified,5/17/2026
PA - Stroudsburg,PASTG,Standard RCM,Excluding Staffing,Ashley Reynolds,N,Y,Home Star Care Inc.,6252 Route 209 Suite 2,Stroudsburg,PA,18360,474671649,1669848552,Never Verified,5/17/2026
PA - SW Pittsburgh,PAPIT,Selective RCM,"Including VA / VAMC, Medicaid",,N,Y,Seba Adobe Inc.,400 Mt Lebanon Blvd.,Pittsburgh,PA,15234,273016612,1619286028,Never Verified,5/17/2026
PA - Washington and Greene Counties,PAWCG,VA Only,Including Helper Bees,,N,Y,Dasilva Group LLC,3244 Washington Road Suite 215 & 220,McMurray,PA,15317,863526271,1992461867,Never Verified,5/17/2026
TN - Chattanooga,TNCTT,VA Only,,,N,N,JRC Ventures Inc.,117 Nowlin Lane Suite 200,Chattanooga,TN,37421,453909041,1992077655,Never Verified,5/17/2026
TN - Knoxville,TNKNX,VA Only,,,N,N,Grubb & Associates Inc.,6500 Papermill Drive Suite 205,Knoxville,TN,37919,261154796,1720266349,Never Verified,5/17/2026
TN - Memphis,TNMPH,Enterprise RCM,,Trish Wolfe,N,N,Home Care Services Memphis LLC,330 Meadowgrove Lane,Memphis,TN,38120,932734219,1750165247,Never Verified,5/17/2026
TX - Arlington (Sannidhanam),TXARL,RCM Startup,,,N,N,Crest Home Care LLC,1600 Airport Freeway Suite 200,Bedford,TX,76022,991954983,1164250304,Never Verified,5/17/2026
TX - Denton,TXDON,Enterprise RCM,,Amy Cashdollar,Y,N,N3Vision Healthcare Enterprise Inc.,"1300 Fulton St , #300B",Denton,TX,76201,854071964,1982296638,Never Verified,5/17/2026
TX - Flower Mound,TXFLO,Standard RCM,,Trish Wolfe,N,N,Star Hill Healthcare LLC,2651 Sagebrush Drive Suite 100,Flower Mound,TX,75028,990433019,1093577819,Never Verified,5/17/2026
TX - Houston Metro/Pasadena,TXNHM,RCM Startup,,,N,N,Elevated Care LLC,13201 Northwest Freeway Suite 685,Houston,TX,77040,993202597,1225856248,Never Verified,5/17/2026
TX - Houston Metro/Pasadena,TXNHM,RCM Startup,,,N,N,Elevated Care LLC,13201 Northwest Freeway Suite 685,Houston,TX,77040,993202597,1225856248,Never Verified,5/17/2026
TX - Mansfield,TXMAN,RCM Startup,,Bethany Christen,N,N,Jones Enterprises 1028 LLC,990 N. Walnut Creek Suite 1002,Mansfield,TX,76063,333828843,1003709437,Never Verified,5/17/2026
TX - Missouri City/Lake Jackson,TXMIS,Standard RCM,Excluding IMO,Trish Wolfe,N,Y,Neighbors Complete Care LLC,7070 Knights Court Suite 101,Missouri City,TX,77459,871909548,1073285672,Never Verified,5/17/2026
TX - Plano,TXNDL,National Accounts,"Excluding Cigna, Department of Labor",Brittney Power,N,Y,Local Home Care Partners LLC,163 Town Place Suite 154,Fairview,TX,75069,921637226,1124724653,Never Verified,5/17/2026
TX - Sugar Land,TXSUG,VA Only,,,Y,N,SSBL LLC,101 Southwestern Blvd. Suite 250,Sugarland,TX,77478,454542439,1528316619,Never Verified,5/17/2026
VA - Charlottesville,VACTV,Enterprise RCM,Excluding Zurich American Insurance,Ashley Reynolds,Y,Y,Central Virginia Holdings Inc.,2820 Hydraulic Road Suite 400,Charlottesville,VA,22901,460855467,1710225966,Never Verified,5/17/2026
VA - Chesapeake,VACWV,Enterprise RCM,,Kadie Van Fosson,Y,N,Legacy Healthcare,816 Greenbrier Circle Suite 208,Chesapeake,VA,23320,862143465,1689253148,Never Verified,5/17/2026
VA - Leesburg,VALSB,National Accounts,"Including CNA, ContinuumRX",Amy Cashdollar,N,Y,Sweet Virginia Care LLC,21035 Sycolin Road Suite 055,Ashburn,VA,20147,475548875,1386002442,Never Verified,5/17/2026
VA - Richmond,VARCM,VA Only,Including Medicaid,,Y,Y,Ressarg Ventures LLC,2221 Pump Road,Richmond,VA,23233,274407858,1205131463,Never Verified,5/17/2026
WA - Bellevue/Eastside,WANSL,Enterprise RCM,,Ashley Reynolds,Y,N,SRC Homecare Inc.,1102 8th Street Suite A,Kirdland,WA,98033,844654269,1891301750,Never Verified,5/17/2026
WI - Lake Country,WILKC,VA Only,Including VA Spina Bifida (VASB),,Y,Y,JNMJ LLC,36 N Allen St,Madison,WI,53726,475546247,1235596289,Never Verified,5/17/2026
WV - Martinsburg,WVNMB,Standard RCM,,,N,N,Sweet Virginia Care WV LLC,21035 Sycolin Road Suite 055,Ashburn,VA,20147,922644212,1396506473,Never Verified,5/17/2026
WV - Martinsburg,WVNMB,Standard RCM,,,N,N,Sweet Virginia Care WV LLC,21035 Sycolin Road Suite 055,Ashburn,VA,20147,922644212,1396506473,Never Verified,5/17/2026
`
  },
  {
    id: 'rp-location-roles',
    name: 'RP Location Roles - RCM Ops Hub.csv',
    type: 'csv',
    content: `DatabaseID,Name,Data_Analyst,Data_Controller,RCM
AKACH,AK - Anchorage,Stephanie Holly,Maley Kinemond,No
ALBIR,AL - Birmingham,Aidan Hall,Beth Durst,Yes
ALHSV,AL - Huntsville,ZZZ,ZZZ,No
ARLTR,AR - Little Rock,Aidan Hall,Beth Durst,Yes
AZPHX,AZ - Phoenix NW/NE,Michaelene Ayers,Stephanie Holly,Yes
CAANH,CA - Anaheim/Yorba Linda,Aidan Hall,Stephanie Holly,Yes
CACBD,CA - Carlsbad,Stephanie Holly,Michaelene Ayers,No
CACAR,CA - Carmel Valley/Rancho Santa Fe,Stephanie Holly,Beth Durst,No
CACWR,CA - Central Western Riverside Co,ZZZ,Maley Kinemond,No
CACOR,CA - Chico,Samantha Kinemond,Michaelene Ayers,No
CACJV,CA - Conejo Valley,Michaelene Ayers,Michaelene Ayers,No
CAENC,CA - Coronado,Michaelene Ayers,Stephanie Holly,Yes
CAESD,CA - Escondido/San Marcos,Stephanie Holly,Stephanie Holly,No
CAFOL,CA - Folsom/El Dorado Hills,ZZZ,ZZZ,No
CAHNT,CA - Huntington Beach,Stephanie Holly,Beth Durst,No
CAOAK,CA - Lafayette,Samantha Kinemond,Maley Kinemond,No
CALKF,CA - Lake Forest,ZZZ,ZZZ,No
CAROS,CA - Roseville,Aidan Hall,Beth Durst,No
CAWHS,CA - S San Fernando Valley,Michaelene Ayers,Beth Durst,No
CASRC,CA - Sacramento/Rancho - Cordova,Michaelene Ayers,Aidan Hall,No
CASFM,CA - San Francisco/Marin County,Michaelene Ayers,Stephanie Holly,No
CASLO,CA - San Luis Obispo,Stephanie Holly,Beth Durst,No
CASEA,CA - Seaside/Soledad,Michaelene Ayers,Beth Durst,No
CASSA,CA - South Sacramento,Michaelene Ayers,Aidan Hall,Yes
CATEM,CA - Lake Elsinore/Temecula,Samantha Kinemond,Beth Durst,No
CAVTA,CA - Ventura,ZZZ,ZZZ,No
COCOS,CO - Colorado Springs,Aidan Hall,Beth Durst,Yes
COGJM,CO - Grand Junction,ZZZ,ZZZ,No
COGRE,CO - Greeley,Michaelene Ayers,Stephanie Holly,Yes
CTHAR,CT - Hartford,Aidan Hall,Maley Kinemond,No
CTNRW,CT - Norwalk,Kaylee Barnhart,Aidan Hall,No
CTHRT,CT - West Hartford,Stephanie Holly,Aidan Hall,No
FLCOG,FL - Coral Gables,Aidan Hall,Michaelene Ayers,Yes
FLRAY,FL - Delray Beach,Kaylee Barnhart,Michaelene Ayers,Yes
FLDOR,FL - Doral,Stephanie Holly,Beth Durst,Yes
FLEOR,FL - East Orlando,Stephanie Holly,Michaelene Ayers,Yes
FLJPT,FL - Jupiter/Martin County,Aidan Hall,Michaelene Ayers,Yes
FLKSM,FL - Kissimmee/Osceola,Aidan Hall,Stephanie Holly,Yes
FLNOM,FL - North Miami,Stephanie Holly,Beth Durst,Yes
FLNSA,FL - North Sarasota,Stephanie Holly,Michaelene Ayers,No
FLPPW,FL - Pembroke Pines,Kaylee Barnhart,Aidan Hall,No
FLFLD,FL - Pompano Beach East,Aidan Hall,Maley Kinemond,Yes
FLPTV,FL - Ponte Vedra/ West Jacksonville,Kaylee Barnhart,Maley Kinemond,Yes
FLSPN,FL - South Pinellas,Michaelene Ayers,Beth Durst,No
FLSPH,FL - Spring Hill/Citrus Springs,Aidan Hall,Michaelene Ayers,No
FLSWO,FL - SW Orlando,ZZZ,ZZZ,No
FLVCE,FL - Venice,Stephanie Holly,Aidan Hall,No
GAGAI,GA - Cumming/Gainesville,Aidan Hall,Stephanie Holly,No
GALAG,GA - Lawrenceville (Oconnor),Kaylee Barnhart,Aidan Hall,No
GANDK,GA - North Dekalb,Aidan Hall,Stephanie Holly,Yes
GASTS,GA - St. Simon Island,Aidan Hall,Michaelene Ayers,No
HIHON,HI - Metro Honolulu,ZZZ,ZZZ,No
IDBOI,ID - Boise,Kaylee Barnhart,Michaelene Ayers,No
ILHEN,IL - Barrington and McHenry County,Stephanie Holly,Stephanie Holly,Yes
ILCTD,IL - Central Dupage-Wheaton,Kaylee Barnhart,Maley Kinemond,No
ILCHG,IL - Chicago,Kaylee Barnhart,Stephanie Holly,No
ILFKP,IL - Elmwood Park,Stephanie Holly,Aidan Hall,No
ILCAL,IL - Pullman / Calumet City,Stephanie Holly,Michaelene Ayers,No
ILSCH,IL - Schaumburg,Stephanie Holly,Michaelene Ayers,No
INFOW,IN - Fort Wayne (Miller),Michaelene Ayers,Beth Durst,Yes
INHAM,IN - Hamilton County,Michaelene Ayers,Beth Durst,Yes
INWLC,IN - West Lake County,ZZZ,ZZZ,Yes
KSOVR,KS - Overland Park,Michaelene Ayers,Stephanie Holly,No
KYLOU,KY - Louisville East,Stephanie Holly,Aidan Hall,No
KYNLX,KY - North Lexington,Michaelene Ayers,Stephanie Holly,Yes
KYFLO,KY - Northern Kentucky,Michaelene Ayers,Beth Durst,No
MALXT,MA - Lexington/Concord,Stephanie Holly,Beth Durst,No
MALOW,MA - Lowell & Andover,Samantha Kinemond,Beth Durst,No
MAMWF,MA - Milford,Kaylee Barnhart,Stephanie Holly,No
MANOR,MA - Norwood,Kaylee Barnhart,Michaelene Ayers,Yes
MDAES,MD - Anne Arundel County,Stephanie Holly,Aidan Hall,No
MDBTM,MD - Baltimore City/County,Michaelene Ayers,Stephanie Holly,Yes
MDBLA,MD - Bel Air,Samantha Kinemond,Maley Kinemond,No
MDBTH,MD - Bethesda,Kaylee Barnhart,Stephanie Holly,Yes
MDCFK,MD - Carroll & Frederick County,Michaelene Ayers,Beth Durst,No
MIBLO,MI - Birmingham,Kaylee Barnhart,Beth Durst,Yes
MIESL,MI - East Lansing,Kaylee Barnhart,Stephanie Holly,Yes
MIGRP,MI - Grosse Pointe/Southeast Macomb,Kaylee Barnhart,Aidan Hall,No
MITRA,MI - Northern Michigan,Aidan Hall,Aidan Hall,Yes
MNMGA,MN - Maple Grove/Andover,Kaylee Barnhart,Michaelene Ayers,Yes
MNPLY,MN - Plymouth,Kaylee Barnhart,Aidan Hall,No
MNSCC,MN - Scott & Carver Counties,Aidan Hall,Stephanie Holly,No
MNBUR,MN - St. Croix Valley,Aidan Hall,Stephanie Holly,Yes
MNSPA,MN - St. Paul,Aidan Hall,Stephanie Holly,No
MOCOL,MO - Mid Missouri,Aidan Hall,Stephanie Holly,Yes
MOKCY,MO - North Kansas City,Michaelene Ayers,Stephanie Holly,No
MOWSC,MO - West St. Louis County,Aidan Hall,Maley Kinemond,Yes
NCASV,NC - Asheville,Kaylee Barnhart,Stephanie Holly,Yes
NCCAR,NC - Cary,Aidan Hall,Stephanie Holly,Yes
NCECH,NC - East Charlotte,Stephanie Holly,Aidan Hall,No
NCCRD,NC - Northern Charlotte/Huntersville,Kaylee Barnhart,Stephanie Holly,No
NCCLL,NC - S. Charlotte,Kaylee Barnhart,Stephanie Holly,Yes
NCGRO,NC - S. Greensboro,Aidan Hall,Beth Durst,Yes
NCRAL,NC - West Raleigh,Stephanie Holly,Maley Kinemond,No
NCWBR,NC - Wilmington/Brunswick County,Kaylee Barnhart,Stephanie Holly,No
NEOMH,NE - Omaha,Aidan Hall,Michaelene Ayers,Yes
NHMAN,NH - Bedford/Manchester,Michaelene Ayers,Stephanie Holly,No
NJFEH,NJ - Freehold,ZZZ,ZZZ,No
NJHAC,NJ - Hackensack,ZZZ,ZZZ,No
NJHRO,NJ - Hamilton Township/Robbinsville,ZZZ,ZZZ,No
NJHUN,NJ - Hunterdon,Kaylee Barnhart,Maley Kinemond,Yes
NJSMC,NJ - Morris County,Stephanie Holly,Maley Kinemond,No
NJMDS,NJ - N Middlesex County,Samantha Kinemond,Beth Durst,No
NJNBK,NJ - New/East Brunswick,ZZZ,ZZZ,Yes
NJNOC,NJ - Northern Ocean County (Parimi),Aidan Hall,Beth Durst,No
NJWFL,NJ - Passaic County West,Samantha Kinemond,Michaelene Ayers,Yes
NJSOM,NJ - Somerset,Kaylee Barnhart,Stephanie Holly,No
NJUNI,NJ - Westfield,Kaylee Barnhart,Stephanie Holly,Yes
NMALB,NM - Albuquerque,Aidan Hall,Beth Durst,No
NVCLV,NV - W Central Las Vegas,Michaelene Ayers,Stephanie Holly,No
NYSYO,NY - North Shore Nassau County,Aidan Hall,Beth Durst,No
OHCTV,OH - Centerville,Michaelene Ayers,Beth Durst,Yes
CINCI,OH - Cincinnati,Kaylee Barnhart,Michaelene Ayers,No
OHCUY,OH - Cuyahoga West,Michaelene Ayers,Stephanie Holly,Yes
OHCBS,OH - East Columbus,Kaylee Barnhart,Stephanie Holly,Yes
OHSTO,OH - Hudson/Solon,Michaelene Ayers,Stephanie Holly,Yes
OKNOE,OK - Edmond/Oklahoma City,Kaylee Barnhart,Aidan Hall,No
OKTSA,OK - Tulsa,ZZZ,ZZZ,No
OREUG,OR - Lane County,Stephanie Holly,Beth Durst,Yes
ORPTL,OR - West Portland,Stephanie Holly,Michaelene Ayers,No
PABET,PA - Bethlehem/Easton,Michaelene Ayers,Michaelene Ayers,No
PACCT,PA - City Center,Aidan Hall,Michaelene Ayers,Yes
PAGCC,PA - Greater Chester County,Kaylee Barnhart,Aidan Hall,Yes
PALAN,PA - Lansdale,Kaylee Barnhart,Michaelene Ayers,No
PANBS,PA - North Bucks County,Michaelene Ayers,Beth Durst,No
PANOH,PA - North Hills/Pittsburgh,Samantha Kinemond,Aidan Hall,No
PABCS,PA - South Bucks County,Michaelene Ayers,Beth Durst,Yes
PASTG,PA - Stroudsburg,Michaelene Ayers,Beth Durst,Yes
PAPIT,PA - SW Pittsburgh,Kaylee Barnhart,Stephanie Holly,No
PACOL,PA - W Montgomery Co,Michaelene Ayers,Beth Durst,No
PAWCG,PA - Washington & Greene Counties,Aidan Hall,Michaelene Ayers,No
SCCHN,SC - Charleston (Jeter),Stephanie Holly,Aidan Hall,No
SCCOL,SC - Columbia,Kaylee Barnhart,Aidan Hall,No
SCROH,SC - Rock Hill,Michaelene Ayers,Beth Durst,No
TNCTT,TN - Chattanooga,Aidan Hall,Michaelene Ayers,No
TNKNX,TN - Knoxville,Aidan Hall,Stephanie Holly,No
TNMPH,TN - Memphis,Michaelene Ayers,Beth Durst,Yes
TXARL,TX - Arlington,Samantha Kinemond,Aidan Hall,No
TXBCS,TX - Bryan/College Station,Aidan Hall,Stephanie Holly,No
TXDON,TX - Denton,Aidan Hall,Beth Durst,Yes
TXDTH,TX - Downtown Houston,Stephanie Holly,Aidan Hall,No
TXFLO,TX - Flower Mound(Muenech),Stephanie Holly,Beth Durst,No
TXIRV,TX - Irving/Dallas Metro,Aidan Hall,Stephanie Holly,No
TXKNG,TX - Kingwood/Humble,Michaelene Ayers,Michaelene Ayers,No
TXMIS,TX - Missouri City/Lake Jackson,Michaelene Ayers,Aidan Hall,Yes
TXNHM,TX - North Houston Metro,ZZZ,ZZZ,Yes
TXNDL,TX - Plano,Kaylee Barnhart,Stephanie Holly,Yes
TXSUG,TX - Sugar Land,Aidan Hall,Aidan Hall,No
TXFRW,TX - West Fort Worth/Granbury,ZZZ,ZZZ,Yes
UTPVO,UT - Provo/Vineyard/Payson,Aidan Hall,Beth Durst,No
UTSND,UT - Sandy/Draper,Michaelene Ayers,Beth Durst,No
VACTV,VA - Charlottesville,Stephanie Holly,Michaelene Ayers,Yes
VACWV,VA - Chesapeake,Kaylee Barnhart,Aidan Hall,Yes
VAERI,VA - E. Richmond,Kaylee Barnhart,Michaelene Ayers,No
VAFFX,VA - Fairfax,Stephanie Holly,Aidan Hall,No
VAFRD,VA - Fredericksburg,Kaylee Barnhart,Beth Durst,No
VALSB,VA - Leesburg,Kaylee Barnhart,Stephanie Holly,Yes
WANSL,WA - Bellevue/Eastside,Aidan Hall,Beth Durst,Yes
WABMV,WA - Bellingham/Mount Vernon,Aidan Hall,Stephanie Holly,No
WAOLY,WA - South Puget Sound,Stephanie Holly,Michaelene Ayers,No
WASPO,WA - Spokane,Aidan Hall,Beth Durst,No
WILKC,WI - Lake Country (Gohar/Gayden),Michaelene Ayers,Stephanie Holly,No
WVNMB,WV - Martinsburg,Kaylee Barnhart,Stephanie Holly,Yes
WVVNA,WV - The Mid-Ohio Valley,Stephanie Holly,Michaelene Ayers,No
DCWAS,DC - Washington,Kaylee Barnhart,Stephanie Holly,No
NJMLR,NJ - Mount Laurel,Aidan Hall,Beth Durst,No
CAHAY,CA - Hayward/Fremont,Samantha Kinemond,Beth Durst,No
NJCAM,NJ - Camden & Cherry Hill,Aidan Hall,Beth Durst,No
CABNT,CA - Brentwood/Stockton,Samantha Kinemond,Maley Kinemond,Yes
AZTUS,AZ - Tucson,Michaelene Ayers,Maley Kinemond,Yes
MANEW,MA - Newton,Samantha Kinemond,Beth Durst,Yes
TXTYL,TX - Tyler,Samantha Kinemond,Aidan Hall,
CAFAI,CA - Fairfield,Kaylee Barnhart,Stephanie Holly,
FLLKL,FL - Lakeland,Samantha Kinemond,Maley Kinemond,
ILOKB,IL - Naperville / Oak Brook,Amy Cashdollar,Amy Cashdollar,
TXMAN,TX - Mansfield,Michaelene Ayers,Beth Durst,
CAELG,CA - East Los Gatos,Kaylee Barnhart,Aidan Hall,
CARCU,CA - Rancho / Cucamonga,Kaylee Barnhart,Aidan Hall,
VARCM,VA - Richmond,Samantha Kinemond,Maley Kinemond,
MICAR,MI - Carleton & Canton,Kaylee Barnhart,Aidan Hall,
MIGRR,MI - North Grand Rapids,Samantha Kinemond,Aidan Hall,
GALCG,GA - Locust Grove,Samantha Kinemond,Stephanie Holly,
GASWA,GA - SW Atlanta & College Park,Samantha Kinemond,Maley Kinemond,
CANCS,CA - N Central San Diego,Samantha Kinemond,Beth Durst,
AZSGS,AZ - Scottsdale,Samantha Kinemond,Stephanie Holly,
TXMHP,TX - Houston Metro,Kaylee Barnhart,Aidan Hall,
IACDR,IA - Cedar Rapids,Samantha Kinemond,Stephanie Holly,
ILTNL,IL - Tinley Park,Kaylee Barnhart,Aidan Hall,
GADGF,GA - Douglasville,Samantha Kinemond,Maley Kinemond,
MASSR,MA - South Shore,Samantha Kinemond,Beth Durst,
FLWSC,FL - West Seminole,Samantha Kinemond,Beth Durst,`
  },
  {
    id: 'tn-employee',
    name: 'TN Employee.csv',
    type: 'csv',
    content: `ID,User_ID,First_Name,Last_Name,Full_Name,Title,Email,Password,Phone,Role,Active,Date_Submitted,Last_Modified,Supervisor,UniqueSocialLogin,RPUser,RemittanceProcessing,First_Look,ActiveCollector,PowerBI_Fliter
5,UIDD8JDZN7E,Charles,Bailey,Charles Bailey,,chuck.bailey@truenorthllp.com,0x7B22616C676F726974686D223A226362416C6732222C2268617368223A222432612431302447756A6B77386965704236383972697053657834412E4E696F696142466E765670496A66666F413237693478486C4B68612F384E32227D,,Admin,-1,,,,,,0,0,0,
9,UIDMXF6TAVL,Emily,Admin,Emily Admin,,emily.admin@truenorthllp.com,0x7B22616C676F726974686D223A226362416C6732222C2268617368223A22243261243130246751536948767262327359345A7A33733568695952754E4373465977766150734E4E61637075614C797A39494A7837527154374D32227D,,Admin,0,,,,,,0,-1,0,
10,UIDB093Q8RS,Emily,Manager,Emily Manager,,emily.manager@truenorthllp.com,0x7B22616C676F726974686D223A226362416C6732222C2268617368223A2224326124313024754B4D5273496B4D6E67346B3168563554485972452E7A782E69556F5A486E537347397639437A6158644755496478653975313936227D,,Manager,0,,,,,,0,-1,0,
11,UIDB9UL7AN5,Emily,Biller,Emily Biller,,emily.biller@truenorthllp.com,0x7B22616C676F726974686D223A226362416C6732222C2268617368223A2224326124313024516F58475250532E2F5330656B6371466E7365314275596C6C2F30654E666363746B735376754B7A504639325061646C6F664E5743227D,,Biller,0,,,,,,0,0,0,
12,UID8HRY73NH,Kadie,Van Fosson,Kadie Van Fosson,NA Manager,kadie.vanfosson@truenorthllp.com,0x7B22616C676F726974686D223A226362416C6732222C2268617368223A222432612431302462374F7864524C3736416B356A385167546A72706B4F3361704E6270395A482F314B65586563764B2F507662325A61535563367175227D,,Manager,-1,,,,,,0,-1,-1,Biller
13,UIDH50OOSEO,Drew,Cooper,Drew Cooper,RCM Analyst,drew.cooper@truenorthllp.com,0x7B22616C676F726974686D223A226362416C6732222C2268617368223A2224326124313024742F724D726B655A53424C595A566F774A744979364F386E37706A33532E44304F3969315559347350624B6D74694C67767230596D227D,,Admin,-1,,,,,,0,-1,0,
14,UIDBR3UJCUT,Aaron,Bombich,Aaron Bombich,RCM Analyst,aaron.bombich@truenorthllp.com,0x7B22616C676F726974686D223A226362416C6732222C2268617368223A222432612431302462374F7864524C3736416B356A385167546A72706B4F3361704E6270395A482F314B65586563764B2F507662325A61535563367175227D,,Manager,-1,,,Kadie Van Fosson,,,0,-1,0,Biller
`
  },
  {
    id: "payer-alias",
    name: "Payer Alias – RCM Ops Hub.csv",
    type: "csv",
    content: "BCK_ID,Payer_Name,Common_Payer_Name,Biller,Collector,Provider_Name,Biller_Collector,Manager,Payer_Profile,Payer_Tag,Date_Assigned,Old_BCK,Payer_ID,Record_Created,FirstLook,FirstLook_Notes,FirstLookPhoneNumber,Location_ID,Unique_Payer,PrivateLTC,GPExcelReference,Bulk_Update\n",
  },
  {
    id: "payer-profiles",
    name: "Payer Profiles – RCM Ops Hub.csv",
    type: "csv",
    content: "Payer_Name,Common_Payer_Name,TN_Tag,Timely_Filing,Submit_To,CollectionTerms,Collector\n",
  }
];

async function ingest() {
  const batch = db.batch();
  const contextRef = db.collection('contexts').doc('rcm');
  
  // Set global tuning to fix collector logic
  batch.set(contextRef, { 
    lastUpdated: new Date().toISOString(),
    customInstructions: "When asked about 'collector assignment' or who is assigned to a location, prioritize the 'Data_Controller' column in the 'RP Location Roles' document. The 'ActiveCollector' column in employee files often refers to billing status, NOT location-based assignment."
  }, { merge: true });

  for (const file of rcmFiles) {
    const fileRef = contextRef.collection('files').doc(file.id);
    batch.set(fileRef, {
      ...file,
      lastUpdated: new Date().toISOString()
    });
  }

  await batch.commit();
  console.log('Successfully ingested RCM manual files and updated tuning rules.');
}

ingest();
