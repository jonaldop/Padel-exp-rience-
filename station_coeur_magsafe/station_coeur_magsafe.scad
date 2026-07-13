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

// Tige
stem_w = 16;  stem_d = 13;  // section
stem_l = 81;                // longueur totale (traverse la base)
stem_y = 14;                // position (vers l'arriere de la base)

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

// Plaque a aretes rondes : minkowski(outline retracte, sphere)
module pebble(t, r) {
    minkowski() {
        translate([0,0,r]) linear_extrude(height=t-2*r) offset(r=-r) children();
        sphere(r=r, $fn=20);
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
module head() {
    union() {
        difference() {
            pebble(head_t, head_round) head_heart2d();
            translate([0, puck_cy, 0]) {
                // logement depuis l'arriere + chanfrein d'entree
                translate([0,0,-eps]) cylinder(h=pocket_depth+eps, d=pocket_d, $fn=fn);
                translate([0,0,-eps]) cylinder(h=1.2, d1=pocket_d+2, d2=pocket_d, $fn=fn);
                // ouverture frontale : le telephone charge au travers
                translate([0,0,pocket_depth-eps]) cylinder(h=front_lip+1, d=open_d, $fn=fn);
            }
            // mortaise de tige + canal de cable (ouverte au dos)
            translate([-slot_w/2, -50, -1]) cube([slot_w, 44, slot_d+1.25]);
        }
        // trois bossettes rampees juste derriere le palet (engagement
        // net ~0,3 aux trois points ; insertion ferme mais aisee)
        for (a = [90, 200, 340])
            translate([0, puck_cy, 0]) rotate([0,0,a])
                translate([pocket_d/2+1.0, 0, pocket_depth-magsafe_thickness-0.9])
                    sphere(r=1.6, $fn=24);
    }
}

// ------------------------- TIGE ---------------------------------------
// Verticale, section arrondie ; rainure arriere a levres : le cable
// (4,2) s'y clipse et reste invisible de face.
module stem() {
    difference() {
        union() {
            linear_extrude(height=stem_l)
                offset(r=3, $fn=32) offset(delta=-3)
                    square([stem_w, stem_d], center=true);
            // levres de la rainure
            for (s = [-1,1])
                translate([s*2.75, stem_d/2-1.05, stem_l/2])
                    cube([1.5, 0.9, stem_l], center=true);
        }
        // rainure du cable (7 x 6, ouverte a l'arriere)
        translate([-3.5, stem_d/2-6, -1]) cube([7, 7, stem_l+2]);
    }
}

// ------------------------- BASE (VIDE-POCHES) -------------------------
module base() {
    difference() {
        union() {
            // socle galet
            pebble(base_h, base_round) base_heart2d();
            // bossage du logement de tige
            translate([0, stem_y, 0]) linear_extrude(height=base_h-1)
                offset(r=5, $fn=32) offset(delta=-5)
                    square([stem_w+10, stem_d+9], center=true);
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
        // mortaise traversante de la tige (inclinee)
        place_stem() translate([-slot_w/2, -slot_d/2, -6]) cube([slot_w, slot_d, 30]);
        // rainure du cable sous la base, en diagonale vers l'arriere droit
        for (seg = [[[0,20],[10,34]], [[10,34],[10,48]]])
            hull() for (p = seg)
                translate([p[0], p[1], -1]) cylinder(h=5.5, r=3.5, $fn=32);
        // sortie arriere : encoche arrondie dans le bord
        translate([10, 36, 0]) hull() {
            translate([-4.5,0,-1]) cube([9, 14, 1]);
            translate([0,0,2]) rotate([-90,0,0]) cylinder(h=14, r=4.5, $fn=32);
        }
        // quatre logements de patins silicone (D8 x 1,2)
        for (p = [[0,-26],[-26,14],[26,14],[0,36]])
            translate([p[0], p[1], -eps]) cylinder(h=1.2+eps, d=8, $fn=32);
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

if      (part == "assembly")      assembly();
else if (part == "coeur")         head();
else if (part == "tige")          stem();
else if (part == "base")          base();
else if (part == "cable_section") cable_section();
