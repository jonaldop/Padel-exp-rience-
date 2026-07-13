// =====================================================================
//  STATION CHARGEUR MAGSAFE EN FORME DE COEUR
//  ---------------------------------------------------------------
//  D'apres la fiche produit : une tete en coeur qui accueille le
//  chargeur MagSafe, une tige avec passage de cable, une base
//  vide-poches en coeur. Trois pieces imprimees, emboitees, sans vis.
//  Bambu Lab A1, PLA, 0,2 mm, sans supports. Cotes en millimetres.
// =====================================================================

part = "assembly";
// assembly | coeur | tige | base | cable_section

// ------------------------- PARAMETRES --------------------------------
magsafe_diameter  = 56.2;   // chargeur Apple officiel
magsafe_thickness = 5.7;
cable_diameter    = 4.2;
head_tilt         = 12;     // inclinaison de la tete (degres / verticale)

decorative_text   = "Je t'aime";  // grave dans le fond du vide-poches
show_decorative_text = true;

fit_clearance = 0.25;       // jeu d'emboitement par cote
recess_clear  = 0.3;        // jeu radial du logement chargeur

// Tete (coeur) — le chargeur s'insere PAR L'ARRIERE ; une levre
// frontale (ouverture 50) l'empeche de traverser : au retrait du
// telephone, la traction des aimants le plaque contre la levre.
head_t     = 18;            // epaisseur
head_round = 3;             // arrondi des aretes (effet galet)
front_lip  = 1.2;           // levre devant le chargeur
open_d     = 50;            // ouverture frontale (le telephone charge au travers)
puck_cy    = 6.5;           // centre du chargeur dans le coeur (local Y)

// Tige — section en QUEUE D'ARONDE : large cote face (stem_w), etroite
// cote dos (stem_wb). Glissee dans la rainure du coeur par le bas, elle
// est verrouillee mecaniquement : impossible de s'echapper vers l'arriere.
stem_w  = 16;  stem_d = 13; // section cote face / profondeur
stem_wb = 14;               // largeur cote dos (pente de la queue d'aronde)
stem_l  = 81;               // longueur totale (traverse la base)
stem_y  = 14;               // position (vers l'arriere de la base)
dovetail_clear = 0.15;      // jeu de glissement dans le coeur

// Base (vide-poches coeur)
base_h   = 12;              // hauteur
tray_depth = 6;             // profondeur du vide-poches
base_round = 2.5;           // arrondi du pourtour

fn = 72;  eps = 0.01;
pocket_d = magsafe_diameter + 2*recess_clear;     // jeu radial 0,3
pocket_depth = head_t - front_lip;                // fond = levre frontale
slot_w   = stem_w + 2*fit_clearance;              // mortaise de la tete
slot_d   = stem_d + 2*fit_clearance;

// ------------------------- OUTILS -------------------------------------
// Coeur bien dodu : deux lobes + pointe, creux central conserve
module fat_heart(lobe_r, lobe_x, lobe_y, tip_r, tip_y) {
    for (s = [-1,1])
        hull() {
            translate([s*lobe_x, lobe_y]) circle(r=lobe_r, $fn=fn);
            translate([0, tip_y]) circle(r=tip_r, $fn=fn);
        }
}

module head_heart2d()  { fat_heart(31, 19, 15, 5, -36); }   // 100 x 87
module base_heart2d()  { fat_heart(33, 19, 12, 6, -40); }   // 104 x 91

// Section trapezoidale de la tige (queue d'aronde), coins arrondis ;
// face large en -Y, dos etroit en +Y
module stem_cross(clr=0) {
    offset(r=1.5, $fn=24) offset(delta=-1.5) offset(delta=clr)
        polygon([[-stem_w/2, -stem_d/2], [stem_w/2, -stem_d/2],
                 [stem_wb/2, stem_d/2], [-stem_wb/2, stem_d/2]]);
}

// Section de la rainure du coeur : queue d'aronde + fente debouchant
// au dos (plus etroite que la face de la tige -> verrouillage)
module slot_cross() {
    union() {
        stem_cross(dovetail_clear);
        translate([-(stem_wb/2 + dovetail_clear + 0.15), stem_d/2 - 1])
            square([stem_wb + 2*dovetail_clear + 0.3, 4]);
    }
}

// Plaque a aretes rondes cote visible, mais DESSOUS PLAT (face plateau) :
// un galet complet mettrait les premieres couches du pourtour en
// surplomb ; ici petit chanfrein a 45 en pied, flancs droits, sommet
// et epaules arrondis par minkowski.
module pebble(t, r) {
    union() {
        hull() {   // chanfrein anti patte d'elephant
            linear_extrude(height=0.1) offset(delta=-1) children();
            translate([0,0,1]) linear_extrude(height=0.1) children();
        }
        translate([0,0,1]) linear_extrude(height=t-r-1) children();  // flancs
        minkowski() {                                    // sommet arrondi
            translate([0,0,r]) linear_extrude(height=t-2*r) offset(r=-r) children();
            sphere(r=r, $fn=20);
        }
    }
}

// Transformations d'assemblage
module place_stem()  { translate([0, stem_y, 0]) rotate([-head_tilt,0,0]) children(); }
// la tete se place au sommet de la tige, dos affleurant la tige
module place_head() {
    c = cos(head_tilt); s = sin(head_tilt);
    top = [0, stem_y + stem_l*s, stem_l*c];                  // sommet de tige
    o_y = top[1] - (-14*s + (0.25+stem_d/2)*c);
    o_z = top[2] - (-14*c - (0.25+stem_d/2)*s);
    translate([0, o_y, o_z]) rotate([90-head_tilt,0,0]) children();
}

// ------------------------- TETE (COEUR) -------------------------------
// Locale : X largeur, Y hauteur (pointe en -Y), Z epaisseur (dos a 0).
// Le chargeur entre PAR L'ARRIERE (chanfrein d'entree, jeu 0,3/cote),
// glisse jusqu'a la levre frontale et se clipse derriere trois
// bossettes rampees ; au retrait du telephone, la traction des aimants
// le plaque contre la levre — il ne peut pas etre arrache. Pour le
// sortir : le pousser par l'ouverture frontale. La mortaise de tige,
// ouverte au dos, sert aussi de passage au cable qui descend sous le
// palet, puis dans la tige.
module head(mono=false) {
    union() {
        difference() {
            // galet inverse : arrondi cote dos, chanfrein cote face —
            // en 3 pieces, s'imprime FACE CONTRE LE PLATEAU (logement
            // vers le haut : aucun pont, aucun surplomb, face texturee)
            translate([0,0,head_t]) mirror([0,0,1])
                pebble(head_t, head_round) head_heart2d();
            translate([0, puck_cy, 0]) {
                // logement depuis l'arriere + chanfrein d'entree
                translate([0,0,-eps]) cylinder(h=pocket_depth+eps, d=pocket_d, $fn=fn);
                translate([0,0,-eps]) cylinder(h=1.2, d1=pocket_d+2, d2=pocket_d, $fn=fn);
                // ouverture frontale : le telephone charge au travers
                translate([0,0,pocket_depth-eps]) cylinder(h=front_lip+1, d=open_d, $fn=fn);
            }
            if (!mono) {
                // rainure en queue d'aronde de la tige : elle se glisse
                // par la pointe du coeur et bute en fin de course
                translate([0, -50, 6.9]) rotate([-90,0,0])
                    linear_extrude(height=36) slot_cross();
                // canal de cable au-dela de la butee, jusque sous le palet
                translate([-4, -16, -1]) cube([8, 10, 14.6]);
            }
        }
        // trois bossettes rampees juste derriere le palet (engagement
        // net ~0,3 aux trois points ; insertion ferme mais aisee)
        for (a = [90, 200, 340])
            translate([0, puck_cy, 0]) rotate([0,0,a])
                translate([pocket_d/2+1.0, 0, pocket_depth-magsafe_thickness-0.9])
                    sphere(r=1.6, $fn=24);
        // deux nervures d'ecrasement sur le fond de la rainure : elles
        // poussent la tige dans le coin de la queue d'aronde -> zero jeu
        if (!mono)
            for (s = [-1, 1])
                translate([s*5-0.5, -36, 13.25]) cube([1, 20, 0.35]);
    }
}

// ------------------------- TIGE ---------------------------------------
// Verticale, section arrondie ; rainure arriere a levres : le cable
// (4,2) s'y clipse et reste invisible de face.
module stem_body() { linear_extrude(height=stem_l) stem_cross(0); }

// Rainure du cable (7 x 6, ouverte a l'arriere), prolongeable au-dela
// du sommet de la tige (utile pour la version monobloc)
module stem_groove_cut(extra=2) {
    translate([-3.5, stem_d/2-6, -1]) cube([7, 7, stem_l+1+extra]);
}

// Levres de la rainure, ancrees 0,7 mm dans ses parois : l'ouverture
// est reduite a 4,0 mm, le cable (4,2) s'y clipse et ne s'echappe plus
module stem_lips() {
    for (s = [-1,1])
        translate([s*3.1 - 1.1, stem_d/2 - 1.2, 1]) cube([2.2, 1.0, stem_l-2]);
}

module stem() {
    difference() {
        union() {
            difference() { stem_body(); stem_groove_cut(); }
            stem_lips();
        }
        // biseau de 12 degres au pied : une fois la tige inclinee dans
        // la base, son extremite affleure exactement le dessous
        translate([0, -stem_d/2, 0]) rotate([12,0,0])
            translate([-20, -5, -30]) cube([40, 40, 30]);
    }
}

// ------------------------- BASE (VIDE-POCHES) -------------------------
module base(mono=false) {
    difference() {
        union() {
            // socle galet
            pebble(base_h, base_round) base_heart2d();
            // bossage du logement de tige (allonge vers l'arriere pour
            // abriter le puits de cable de la version monobloc)
            translate([0, stem_y+3, 0]) linear_extrude(height=base_h-1)
                offset(r=5, $fn=32) offset(delta=-5)
                    square([stem_w+10, stem_d+15], center=true);
        }
        // vide-poches (paroi 5, bord adouci)
        translate([0,0,base_h-tray_depth]) linear_extrude(height=tray_depth+1)
            offset(r=-5) base_heart2d();
        hull() {   // chanfrein du bord du vide-poches
            translate([0,0,base_h-1.2]) linear_extrude(height=eps) offset(r=-5) base_heart2d();
            translate([0,0,base_h+eps]) linear_extrude(height=eps) offset(r=-3.4) base_heart2d();
        }
        // texte grave dans le fond
        if (show_decorative_text)
            translate([0, -12, base_h-tray_depth-0.6])
                linear_extrude(height=1)
                    text(decorative_text, size=7, halign="center", valign="center",
                         font="Liberation Sans:style=Bold Italic", spacing=1.1);
        // mortaise traversante de la tige (inclinee, queue d'aronde)
        if (!mono)
            place_stem() translate([0,0,-6]) linear_extrude(height=30) stem_cross(0.25);
        // rainure du cable sous la base, en diagonale vers l'arriere droit
        for (seg = [[[0,27],[10,38]], [[10,38],[10,48]]])
            hull() for (p = seg)
                translate([p[0], p[1], -1]) cylinder(h=5.5, r=3.5, $fn=32);
        // sortie arriere : encoche arrondie dans le bord
        translate([10, 36, 0]) hull() {
            translate([-4.5,0,-1]) cube([9, 14, 1]);
            translate([0,0,2]) rotate([-90,0,0]) cylinder(h=14, r=4.5, $fn=32);
        }
        // poche de lest sous l'avant de la base : y coller ecrous,
        // rondelles ou plombs (~40-70 g) pour que la station ne suive
        // pas le telephone au retrait. Croisillon = ponts < 15 mm.
        difference() {
            translate([0, -11, -eps]) cylinder(h=3, d=32, $fn=fn);
            for (a = [0, 90])
                translate([0, -11, 0]) rotate([0,0,a])
                    translate([-1.5, -17, -1]) cube([3, 34, 4.2]);
        }
        // quatre logements de patins silicone (D8 x 1,2)
        for (p = [[0,-32],[-28,10],[28,10],[0,34]])
            translate([p[0], p[1], -eps]) cylinder(h=1.2+eps, d=8, $fn=32);
    }
}

// ------------------------- CORPS MONOBLOC ------------------------------
// Toute la station en UNE SEULE piece imprimee debout : coeur, tige et
// base fondus, collerette de raccord sous le coeur, rainure de cable
// continue au dos (a levres : le cable s'y clipse), puits interne
// derriere la tige pour rejoindre le dessous de la base. La silhouette
// du coeur monte a moins de ~25 degres de devers : seuls quelques
// supports peints DANS le logement MagSafe sont necessaires.
module corps_unique() {
    difference() {
        union() {
            difference() {
            union() {
                base(mono=true);
                place_stem() stem_body();
                place_head() head(mono=true);
                // collerette de raccord tige -> pointe du coeur
                hull() {
                    place_stem() translate([0,0,40]) linear_extrude(height=1) stem_cross(0);
                    place_head() translate([-14, -27, 0]) cube([28, 1.5, head_t]);
                }
            }
            // rainure de cable continue : tout le long de la tige, a
            // travers la collerette, jusque sous le palet MagSafe
            place_stem() stem_groove_cut(extra=32);
                // puits du cable derriere la tige (la fiche USB-C
                // passe), traversant la base jusqu'a la rainure du dessous
                translate([-6.5, 23, -1]) cube([13, 8, 14]);
            }
            // levres de la rainure : le cable s'y clipse sur toute la tige
            place_stem() stem_lips();
        }
        // ras du sol : rien ne depasse sous z = 0
        translate([-200, -200, -50]) cube([400, 400, 50]);
    }
}

// ------------------------- ASSEMBLAGE ----------------------------------
module assembly() {
    color("MistyRose")  base();
    color("Pink")       place_stem() stem();
    color("LightPink")  place_head() head();
}

module cable_section() {
    difference() { assembly(); translate([0,-80,-20]) cube([200,300,300]); }
}

// le coeur s'exporte face contre le plateau (logement ouvert vers le haut)
module station_coeur_print() {
    translate([0,0,head_t]) rotate([180,0,0]) head();
}

if      (part == "assembly")      assembly();
else if (part == "monobloc")      corps_unique();
else if (part == "coeur")         station_coeur_print();
else if (part == "tige")          stem();
else if (part == "base")          base();
else if (part == "cable_section") cable_section();
