// =====================================================================
//  STATION DE RECHARGE MAGSAFE — STYLE VESPA VINTAGE
//  ---------------------------------------------------------------
//  Station de charge pour iPhone (MagSafe) + vide-poches,
//  inspiree des courbes d'un scooter italien retro.
//  Concue pour impression FDM mono-couleur sur Bambu Lab A1
//  (plateau 256 x 256 mm), PLA / PLA Matte, sans supports.
//
//  3 pieces imprimees :
//    1. la base (socle + rebord telephone + vide-poches)
//    2. le dossier incline (logement MagSafe + phare decoratif)
//    3. le cache arriere (ferme le MagSafe et le canal de cable)
//  + en option : plaque de lest, badge logo generique.
//
//  Toutes les cotes sont en millimetres.
// =====================================================================

// ---------------------------------------------------------------------
//  PIECE A AFFICHER / EXPORTER
// ---------------------------------------------------------------------
part = "assembly";
// Valeurs possibles :
// assembly       -> toutes les pieces assemblees
// base           -> la base seule (orientation d'impression)
// dossier        -> le dossier seul (dos sur le plateau)
// cache          -> le cache arriere seul (face visible sur le plateau)
// logo           -> badge logo generique separe
// cable_section  -> vue en coupe du passage du cable
// plaque         -> plaque de fermeture de la cavite de lest (bonus)

// ---------------------------------------------------------------------
//  OPTIONS PRINCIPALES
// ---------------------------------------------------------------------
show_logo = false;              // badge logo rapporte (false = version sans logo)
show_decorative_text = true;    // texte decoratif en relief sur le dossier
decorative_text = "LA DOLCE VITA"; // texte generique (pas de marque protegee)

magsafe_diameter  = 56.2;       // diametre du chargeur MagSafe Apple
magsafe_thickness = 5.7;        // epaisseur du chargeur
cable_diameter    = 4.2;        // diametre du cable USB-C du chargeur
phone_angle       = 68;         // inclinaison du plan telephone (degres / horizontale)

cable_exit = "rear";            // sortie du cable : "rear" (arriere) ou "bottom" (dessous)
weight_cavity = true;           // cavite de lest sous la base (rondelles metalliques)

// Hauteur du centre MagSafe au-dessus du sol (spec : 105 a 115 mm).
// Le telephone est tenu par les aimants ; reduire vers ~92 mm si l'on
// souhaite qu'un iPhone Pro Max repose exactement sur le rebord.
magsafe_center_height = 105;

// ---------------------------------------------------------------------
//  TOLERANCES D'IMPRESSION
// ---------------------------------------------------------------------
fit_clearance   = 0.25;   // jeu par cote pour les emboitements
cover_clearance = 0.25;   // jeu du cache arriere
magsafe_clear   = 0.25;   // jeu radial autour du chargeur
screw_pilot_d   = 2.8;    // trou pilote vis M3 autotaraudeuse
screw_pass_d    = 3.4;    // trou de passage vis M3
screw_head_d    = 6.4;    // logement tete cylindrique M3
insert_d        = 4.6;    // logement insert filete M3
insert_depth    = 5;      // profondeur du logement d'insert

// ---------------------------------------------------------------------
//  DIMENSIONS GENERALES
// ---------------------------------------------------------------------
base_w   = 150;   // largeur de la base
base_d   = 125;   // profondeur de la base
base_h   = 18;    // hauteur de la base
corner_r = 14;    // rayon des angles de la base
edge_r   = 3;     // rayon d'arrondi des aretes superieures

phone_cx = -36;   // axe X du support telephone (zone gauche)

// Rebord telephone
lip_w = 72;       // largeur utile du rebord
lip_t = 5;        // epaisseur du muret avant
lip_h = 8;        // hauteur du muret au-dessus de la base
lip_y = 16;       // position Y du muret (avant du rebord)
shelf_d = 13;     // profondeur du rebord (muret inclus)
lip_notch_w = 14; // encoche cable Lightning / USB-C
lip_notch_d = 8;  // profondeur de l'encoche

// Vide-poches (zone droite)
tray_x1 = 7;   tray_x2 = 67;    // emprise interieure en X (largeur 60)
tray_y1 = 38;  tray_y2 = 116;   // emprise interieure en Y (profondeur 78)
tray_depth = 11;                // profondeur utile
tray_r = 8;                     // rayon des coins interieurs

// Dossier incline
dos_w_bot = 76;    // largeur en bas
dos_w_top = 72;    // largeur en haut (= diametre de l'arc sommital)
dos_t     = 7;     // epaisseur structurelle
dos_top_z = 180;   // hauteur totale de la station
dos_face_y = 46;   // position Y de la face avant du dossier au niveau z = base_h
tenon_w   = 60;    // largeur du tenon d'emboitement
tenon_engage = 12; // profondeur d'emboitement vertical dans la base

// Phare / logement MagSafe (le phare decoratif est centre sur le MagSafe :
// bossage circulaire raye facon optique de phare, le chargeur affleure au
// centre comme la lentille — le decor ne gene jamais la charge).
boss_d   = 64;     // diametre exterieur du phare (bossage avant)
boss_h   = 5;      // saillie du bossage (degage la bosse camera de l'iPhone)
open_d   = 50;     // ouverture frontale (inferieure au diametre du chargeur)
front_lip = 1.2;   // matiere devant le chargeur (0.8 a 1.2 max)

// Canal de cable
chan_w = 5.2;      // largeur du canal (cable 4.2)
chan_d = 5;        // profondeur du canal

// Cache arriere
cover_w = 66;      // largeur du cache
cover_y1 = 8;      // debut (bas, coordonnee locale dossier)
cover_y2 = 140;    // fin (haut)
cover_t = 2.8;     // epaisseur
cover_r = 12;      // rayon des coins

// Cavite de lest
wc_x = 40;                 // demi-largeur de la cavite
wc_y1 = 6;  wc_y2 = 34;    // emprise Y
wc_depth = 5;              // profondeur totale
wc_rab = 3;                // debord de la feuillure de la plaque
plate_t = 2.8;             // epaisseur de la plaque de lest

// ---------------------------------------------------------------------
//  VALEURS DERIVEES (ne pas modifier)
// ---------------------------------------------------------------------
sA = sin(phone_angle);  cA = cos(phone_angle);
dos_len   = (dos_top_z - base_h)/sA;              // longueur du dossier le long de la pente
tenon_len = tenon_engage/sA;                      // longueur du tenon le long de la pente
dos_Yt    = dos_face_y + dos_t/sA;                // origine Y du dossier place
ms_ly     = (magsafe_center_height - base_h)/sA;  // centre MagSafe (coord. locale dossier)
pocket_d  = magsafe_diameter + 2*magsafe_clear;   // diametre du logement chargeur
pocket_depth = dos_t + boss_h - front_lip;        // profondeur du logement depuis l'arriere
arc_r    = dos_w_top/2;                           // rayon de l'arc sommital
arc_cy   = dos_len - arc_r;                       // centre de l'arc sommital
dos_screw_y = dos_Yt - tenon_engage*cA/sA - (dos_t/2)/sA; // Y des vis dossier/base
cover_screws = [[-14,58],[14,58],[-14,129],[14,129]];     // vis du cache (coord. locales)
tray_cx = (tray_x1+tray_x2)/2;  tray_cy = (tray_y1+tray_y2)/2;

fn_vis  = 64;   // finesse des cercles visibles
fn_hide = 32;   // finesse des elements caches
eps = 0.01;

// ---------------------------------------------------------------------
//  OUTILS GENERIQUES
// ---------------------------------------------------------------------

// Prisme rectangulaire a coins arrondis (2D extrude)
module rrect(x1, y1, x2, y2, r, h, fn=fn_hide) {
    linear_extrude(height=h)
        offset(r=r, $fn=fn) offset(delta=-r)
            polygon([[x1,y1],[x2,y1],[x2,y2],[x1,y2]]);
}

// Pilier d'angle de la base : cylindre + tore sommital (arete arrondie)
// + petit chanfrein en pied (anti "patte d'elephant")
module base_pillar() {
    union() {
        cylinder(h=0.8, r1=corner_r-0.8, r2=corner_r, $fn=fn_vis);
        translate([0,0,0.8]) cylinder(h=base_h-edge_r-0.8, r=corner_r, $fn=fn_vis);
        translate([0,0,base_h-edge_r]) {
            rotate_extrude($fn=fn_vis)
                translate([corner_r-edge_r,0]) circle(r=edge_r, $fn=24);
            cylinder(h=edge_r, r=corner_r-edge_r, $fn=fn_vis);
        }
    }
}

// Transformation locale dossier -> position assemblee
// (le dossier est modelise a plat, dos sur le plateau : X largeur,
//  Y longueur le long de la pente, Z epaisseur, dos a Z=0)
module place_dossier() {
    translate([phone_cx, dos_Yt, base_h])
        rotate([phone_angle,0,0])
            children();
}

// =====================================================================
//  1. BASE
// =====================================================================

// Corps de la base : plus large a l'avant qu'a l'arriere, flancs
// legerement galbes (silhouette de tablier de scooter), aretes
// superieures arrondies.
module rounded_base() {
    hull() {
        translate([-61, 14, 0])   base_pillar();   // avant gauche (le + large)
        translate([ 61, 14, 0])   base_pillar();   // avant droit
        translate([-60.5, 58, 0]) base_pillar();   // galbe lateral gauche
        translate([ 60.5, 58, 0]) base_pillar();   // galbe lateral droit
        translate([-57, 111, 0])  base_pillar();   // arriere gauche
        translate([ 57, 111, 0])  base_pillar();   // arriere droit
    }
}

// Muret avant du rebord telephone (arrondi partout)
module phone_lip() {
    hull() {
        for (x = [phone_cx-lip_w/2+2.5, phone_cx+lip_w/2-2.5]) {
            translate([x, lip_y+lip_t/2, base_h-2])
                cylinder(h=2, r=lip_t/2, $fn=fn_hide);
            translate([x, lip_y+lip_t/2, base_h+lip_h-lip_t/2])
                sphere(r=lip_t/2, $fn=fn_hide);
        }
    }
}

// Encoche du rebord pour un cable branche directement au telephone
module lip_notch_cut() {
    translate([0,0,base_h-1])
    linear_extrude(height=lip_h+3)
        offset(r=3, $fn=fn_hide) offset(delta=-3)
            polygon([[phone_cx-lip_notch_w/2, lip_y-2],
                     [phone_cx+lip_notch_w/2, lip_y-2],
                     [phone_cx+lip_notch_w/2, lip_y+lip_notch_d],
                     [phone_cx-lip_notch_w/2, lip_y+lip_notch_d]]);
}

// Vide-poches : poche a coins arrondis, fond en cuvette tres douce,
// rainures concentriques, chanfrein d'entree et echancrure de prise.
module tray() {
    floor_z = base_h - tray_depth;                    // fond a z = 7
    union() {
        // poche principale
        translate([0,0,floor_z])
            rrect(tray_x1, tray_y1, tray_x2, tray_y2, tray_r, base_h-floor_z+2, fn_vis);
        // pente douce du fond vers le centre (cuvette conique de 0,8 mm)
        translate([tray_cx, tray_cy, floor_z-0.8+eps])
            cylinder(h=0.8, r1=eps, r2=44, $fn=fn_hide);
        // rainures concentriques decoratives / anti-glisse (0,7 mm)
        for (r = [6, 12, 18, 24])
            translate([tray_cx, tray_cy, floor_z-1.4])
                difference() {
                    cylinder(h=2.2, r=r+0.4, $fn=fn_vis);
                    translate([0,0,-eps]) cylinder(h=2.4, r=r-0.4, $fn=fn_vis);
                }
        // chanfrein adouci du bord superieur
        hull() {
            translate([0,0,base_h-1.4])
                rrect(tray_x1, tray_y1, tray_x2, tray_y2, tray_r, eps, fn_vis);
            translate([0,0,base_h])
                rrect(tray_x1-1.6, tray_y1-1.6, tray_x2+1.6, tray_y2+1.6, tray_r+1.6, 2, fn_vis);
        }
        // echancrure laterale pour saisir les objets (calotte spherique)
        translate([tray_x2+7, tray_cy, base_h+9]) sphere(r=16, $fn=fn_vis);
    }
}

// Logement du tenon du dossier dans la base (jeu 0,25 mm par cote)
module dossier_socket_cut() {
    place_dossier()
        translate([-tenon_w/2-fit_clearance, -tenon_len-4, -fit_clearance])
            cube([tenon_w+2*fit_clearance, tenon_len+10, dos_t+2*fit_clearance]);
}

// Percages verticaux communs base / tenon : passage M3 + tete
// cylindrique sous la base, logement d'insert M3 (4,6 x 5) puis trou
// pilote 2,8 pour vis autotaraudeuse dans le tenon.
module dossier_screw_cuts() {
    for (dx = [-18, 18])
        translate([phone_cx+dx, dos_screw_y, 0]) {
            translate([0,0,-1]) cylinder(h=3.5, d=screw_head_d+0.4, $fn=fn_hide); // tete
            translate([0,0,-1]) cylinder(h=8, d=screw_pass_d, $fn=fn_hide);       // passage
            translate([0,0,5.9]) cylinder(h=insert_depth+0.2, d=insert_d, $fn=fn_hide); // insert
            translate([0,0,5.9]) cylinder(h=11.5, d=screw_pilot_d, $fn=fn_hide);  // pilote
        }
}

// Canal de cable dans la base : descente sous le tenon, coude adouci,
// rainure sous la base jusqu'a l'arriere, sortie au choix.
module cable_channel_base_cut() {
    union() {
        // descente verticale sous le logement du tenon
        translate([phone_cx-chan_w/2, 41, -1]) cube([chan_w, 8.5, 8]);
        // coude interne adouci (rayon 8, aucun angle brutal)
        translate([phone_cx-chan_w/2, 54, 9]) rotate([0,90,0]) cylinder(h=chan_w, r=8, $fn=fn_hide);
        translate([phone_cx-chan_w/2, 47, 6.5]) cube([chan_w, 7, 6]);
        // rainure sous la base (7 x 4) rejoignant le bord arriere
        translate([phone_cx-3.5, 44, -1]) cube([7, base_d-44+2, 5]);
        // sortie arriere : ouverture 9 x 6 a sommet arrondi anti-coupure
        if (cable_exit == "rear")
            hull() {
                translate([phone_cx-4.5, 108, -1]) cube([9, base_d-108+2, 1]);
                translate([phone_cx, 108, 1.5]) rotate([-90,0,0])
                    cylinder(h=base_d-108+2, r=4.5, $fn=fn_hide);
            }
    }
}

// Logements des quatre patins silicone (D10 x 1,5)
module rubber_feet() {
    for (p = [[-62,12],[62,12],[-62,113],[62,113]])
        translate([p[0], p[1], -eps]) cylinder(h=1.5+eps, d=10, $fn=fn_vis);
}

// Cavite de lest sous la base : feuillure pour la plaque + cavite a
// rondelles, nervuree pour rester imprimable sans supports (ponts < 15 mm).
module weight_compartment() {
    union() {
        // feuillure de la plaque (jeu 0,25 par cote via la plaque)
        rrect(-wc_x-wc_rab, wc_y1-2, wc_x+wc_rab, wc_y2+2, 4, plate_t+0.15, fn_hide);
        // cavite pour rondelles
        rrect(-wc_x, wc_y1, wc_x, wc_y2, 3, wc_depth, fn_hide);
    }
}

// Nervures + colonnette de vis centrale de la cavite de lest (ajoutees
// apres soustraction de la cavite)
module weight_compartment_ribs() {
    inter = plate_t+0.15;   // sommet de la feuillure
    for (y = [13, 25.5])
        translate([-wc_x, y, inter]) cube([2*wc_x, 2, wc_depth-inter+eps]);
    difference() {
        translate([0, 20, inter]) cylinder(h=wc_depth-inter+eps, d=8, $fn=fn_hide);
        translate([0, 20, -1]) cylinder(h=wc_depth+2, d=2.6, $fn=fn_hide);
    }
}

// Trou pilote de la vis de plaque de lest
module weight_plate_screw_cut() {
    translate([0, 20, -1]) cylinder(h=wc_depth+5, d=2.6, $fn=fn_hide);
}

// ------------------- BASE COMPLETE -------------------
module station_base() {
    difference() {
        union() {
            difference() {
                union() { rounded_base(); phone_lip(); }
                tray();
                dossier_socket_cut();
                cable_channel_base_cut();
                if (weight_cavity) weight_compartment();
            }
            if (weight_cavity) weight_compartment_ribs();
        }
        lip_notch_cut();
        dossier_screw_cuts();
        rubber_feet();
        if (weight_cavity) weight_plate_screw_cut();
    }
}

// Plaque de fermeture de la cavite de lest (piece bonus)
module weight_plate() {
    difference() {
        rrect(-wc_x-wc_rab+cover_clearance, wc_y1-2+cover_clearance,
              wc_x+wc_rab-cover_clearance, wc_y2+2-cover_clearance, 4, plate_t, fn_vis);
        translate([0,20,-eps]) cylinder(h=plate_t+2*eps, d=screw_pass_d, $fn=fn_hide);
        translate([0,20,-eps]) cylinder(h=2, d=screw_head_d, $fn=fn_hide);  // tete affleurante
        // encoche de prise au bord
        translate([wc_x+wc_rab, 20, plate_t]) rotate([0,90,0]) cylinder(h=8, r=3, $fn=fn_hide, center=true);
    }
}

// =====================================================================
//  2. DOSSIER INCLINE (modelise a plat, dos sur le plateau :
//     X = largeur, Y = longueur le long de la pente, Z = epaisseur,
//     dos a Z = 0, face avant a Z = dos_t)
// =====================================================================

// Silhouette 2D du dossier : trapeze galbe, sommet en arc doux
module dossier_outline() {
    hull() {
        for (s = [-1,1]) {
            translate([s*(dos_w_bot/2-10), 6])  circle(r=10, $fn=fn_vis); // bas
            translate([s*(dos_w_bot/2-9), 70])  circle(r=10, $fn=fn_vis); // galbe lateral
        }
        translate([0, arc_cy]) circle(r=arc_r, $fn=fn_vis);               // arc sommital
    }
}

// Phare decoratif : bossage circulaire centre sur le MagSafe.
// Cerclage en relief, stries rayonnantes facon optique de phare,
// le chargeur affleure au centre comme la lentille. La saillie de
// 5 mm degage aussi la bosse camera de l'iPhone.
module decorative_headlight() {
    translate([0, ms_ly, 0])
        difference() {
            // bossage a sommet adouci
            hull() {
                cylinder(h=dos_t+boss_h-1, d=boss_d, $fn=fn_vis);
                cylinder(h=dos_t+boss_h, d=boss_d-3, $fn=fn_vis);
            }
            // stries verticales rayonnantes (largeur 1,6, pas 7,2)
            for (i = [0:27])
                rotate([0,0,i*360/28])
                    translate([boss_d/2, 0, dos_t-1])
                        cylinder(h=boss_h+2, d=1.6, $fn=16);
            // cerclage : gorge circulaire sur la face (relief de 0,7)
            translate([0,0,dos_t+boss_h-0.7])
                difference() {
                    cylinder(h=1, r=29.5, $fn=fn_vis);
                    translate([0,0,-eps]) cylinder(h=1.2, r=28.5, $fn=fn_vis);
                }
        }
}

// Logement du chargeur MagSafe, insere par l'arriere.
// L'ouverture frontale (open_d) est inferieure au diametre du chargeur :
// il ne peut pas traverser ; il reste front_lip mm de matiere devant.
module magsafe_pocket() {
    union() {
        translate([0, ms_ly, -eps]) {
            cylinder(h=pocket_depth+eps, d=pocket_d, $fn=fn_vis);
            cylinder(h=1, d1=pocket_d+2, d2=pocket_d, $fn=fn_vis);  // chanfrein d'insertion
            cylinder(h=dos_t+boss_h+1, d=open_d, $fn=fn_vis);       // ouverture frontale
        }
    }
}

// Trois clips (bossettes flexibles) retenant le chargeur, en plus du
// cache visse ; places hors du canal de cable, retrait toujours possible.
module magsafe_clips() {
    for (a = [90, 210, 330])
        translate([0, ms_ly, 0]) rotate([0,0,a])
            translate([pocket_d/2+1.0, 0, pocket_depth-magsafe_thickness-0.6])
                sphere(r=1.6, $fn=fn_hide);
}

// Canal de cable du dossier : rainure droite dans le dos, du logement
// MagSafe jusqu'au bout du tenon (fermee ensuite par le cache arriere).
module cable_channel() {
    translate([-chan_w/2, -tenon_len-3, -eps]) cube([chan_w, ms_ly+3, chan_d]);
}

// Colonnettes pleines autour des pilotes de vis du cache : garantissent
// de la matiere saine meme si les parametres sont modifies.
module screw_bosses() {
    for (p = cover_screws)
        translate([p[0], p[1], 0]) cylinder(h=dos_t, d=8, $fn=fn_hide);
}

// Pilotes de vis du cache arriere (M3 x 6 autotaraudeuse, prof. 5,6)
module cover_pilot_cuts() {
    for (p = cover_screws)
        translate([p[0], p[1], -eps]) cylinder(h=5.6, d=screw_pilot_d, $fn=fn_hide);
}

// Texte decoratif en relief (0,8 mm), centre au-dessus du phare.
// Le texte est recoupe a l'interieur de la silhouette (marge 2 mm) :
// un texte personnalise trop long ne debordera jamais du dossier.
module decorative_text_module() {
    intersection() {
        translate([0, 152, dos_t-0.2])
            linear_extrude(height=1.0)
                text(decorative_text, size=6, font="Liberation Sans:style=Bold",
                     halign="center", valign="center", spacing=1.05, $fn=fn_hide);
        translate([0,0,dos_t-0.3]) linear_extrude(height=1.2)
            offset(delta=-2) dossier_outline();
    }
}

// ------------------- DOSSIER COMPLET (coordonnees locales) ---------
module back_panel() {
    union() {
        difference() {
            union() {
                linear_extrude(height=dos_t) dossier_outline();
                // tenon d'emboitement (depasse vers le bas, recoupe ensuite)
                translate([-tenon_w/2, -tenon_len-2, 0]) cube([tenon_w, tenon_len+8, dos_t]);
                screw_bosses();
                decorative_headlight();
                if (show_decorative_text) decorative_text_module();
            }
            magsafe_pocket();
            cable_channel();
            cover_pilot_cuts();
            if (show_logo)  // logement du badge logo rapporte
                translate([0, 42, dos_t-1.0]) cylinder(h=boss_h+2, d=24.5, $fn=fn_vis);
        }
        magsafe_clips();
    }
}

// Dossier en position assemblee : incline a phone_angle, recoupe au ras
// du dessus de la base (epaulement plat) sauf le tenon, et perce pour
// les deux vis M3 venant du dessous.
module dossier_assembled() {
    difference() {
        place_dossier() back_panel();
        // tout ce qui depasse sous le plan superieur de la base,
        // a l'exception du tenon, est retranche
        difference() {
            translate([-200,-60,-60]) cube([400,320,60+base_h]);
            place_dossier()
                translate([-tenon_w/2-0.1, -tenon_len, -0.1])
                    cube([tenon_w+0.2, tenon_len+4, dos_t+0.2]);
        }
        dossier_screw_cuts();
    }
}

// Dossier en orientation d'impression (dos pose sur le plateau)
module station_dossier_print() {
    rotate([-phone_angle,0,0]) translate([-phone_cx,-dos_Yt,-base_h])
        dossier_assembled();
}

// =====================================================================
//  3. CACHE ARRIERE (coordonnees locales dossier, plaque contre le dos)
// =====================================================================

module cover_outline() {
    hull()
        for (p = [[-cover_w/2+cover_r, cover_y1+cover_r],
                  [ cover_w/2-cover_r, cover_y1+cover_r],
                  [-cover_w/2+cover_r, cover_y2-cover_r],
                  [ cover_w/2-cover_r, cover_y2-cover_r]])
            translate(p) circle(r=cover_r, $fn=fn_vis);
}

module rear_cover() {
    difference() {
        union() {
            // plaque a chants biseautes (aucune arete vive)
            hull() {
                translate([0,0,-0.1]) linear_extrude(height=0.1) cover_outline();
                translate([0,0,-cover_t]) linear_extrude(height=0.1)
                    offset(delta=-1.4) cover_outline();
            }
            // poussoir central : plaque le chargeur au fond de son logement
            translate([0, ms_ly, -eps])
                cylinder(h=pocket_depth-magsafe_thickness-0.3, d=40, $fn=fn_vis);
        }
        // quatre vis M3 a tete cylindrique
        for (p = cover_screws) translate([p[0], p[1], 0]) {
            translate([0,0,-cover_t-eps]) cylinder(h=cover_t+6, d=screw_pass_d, $fn=fn_hide);
            translate([0,0,-cover_t-eps]) cylinder(h=1.6, d=screw_head_d, $fn=fn_hide);
        }
        // decor "roue de secours" : anneaux concentriques graves (0,6)
        translate([0, ms_ly, 0]) {
            for (r = [12, 17, 22])
                translate([0,0,-cover_t-eps])
                    difference() {
                        cylinder(h=0.6+eps, r=r+0.5, $fn=fn_vis);
                        translate([0,0,-eps]) cylinder(h=0.8, r=r-0.5, $fn=fn_vis);
                    }
            translate([0,0,-cover_t-eps]) cylinder(h=0.6+eps, d=8, $fn=fn_vis);
        }
        // encoche de prise pour retirer le cache
        translate([0, cover_y2+1, -cover_t-1]) cylinder(h=cover_t+2, d=10, $fn=fn_vis);
    }
}

// Cache en orientation d'impression (face decoree sur le plateau)
module station_cache_print() {
    translate([0, -(cover_y1+cover_y2)/2, cover_t]) rear_cover();
}

// =====================================================================
//  4. BADGE LOGO GENERIQUE (optionnel, a coller dans son logement)
//     Aucun logo de marque protegee : simple ecusson "SC" (Scooter Club)
// =====================================================================
module logo_badge() {
    union() {
        cylinder(h=1.6, d=24, $fn=fn_vis);
        difference() {   // cerclage
            cylinder(h=2.4, d=24, $fn=fn_vis);
            translate([0,0,1]) cylinder(h=2, d=20.8, $fn=fn_vis);
        }
        translate([0,0,1.4]) linear_extrude(height=1.0)
            text("SC", size=9, font="Liberation Sans:style=Bold Italic",
                 halign="center", valign="center");
    }
}

// =====================================================================
//  5. ASSEMBLAGE ET VUES
// =====================================================================
module assembly() {
    color("Gainsboro")   station_base();
    color("WhiteSmoke")  dossier_assembled();
    color("Silver")      place_dossier() rear_cover();
    if (weight_cavity) color("DimGray") weight_plate();
    if (show_logo)
        color("DarkSlateGray")
            place_dossier() translate([0, 42, dos_t-1.0]) logo_badge();
}

// Vue en coupe : plan vertical passant par l'axe du canal de cable
module cable_section() {
    difference() {
        assembly();
        translate([phone_cx, -30, -30]) cube([200, 300, 320]);
    }
}

// ---------------------------------------------------------------------
//  SELECTEUR DE PIECE
// ---------------------------------------------------------------------
if      (part == "assembly")      assembly();
else if (part == "base")          station_base();
else if (part == "dossier")       station_dossier_print();
else if (part == "cache")         station_cache_print();
else if (part == "logo")          logo_badge();
else if (part == "plaque")        weight_plate();
else if (part == "cable_section") cable_section();
