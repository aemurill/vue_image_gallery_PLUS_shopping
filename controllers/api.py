import tempfile, time

# Cloud-safe of uuid, so that many cloned servers do not all use the same uuids.
from gluon.utils import web2py_uuid

# Here go your api methods.
@auth.requires_login()
@auth.requires_signature()
def add_image():
    print('adding image')
    image_id = db.user_images.insert(
        image_url = request.vars.image_url,
        price = request.vars.price,
    )
    db(db.user_images.image_url == None).delete()
    time.sleep(1) #DELAY SO NEW IMAGE APPEARS
    print('image added')
    # image = db.user_images(image_id)
    # print(image)
    return
    
@auth.requires_login()
@auth.requires_signature()
def get_user_images():
    user_id = request.vars.user_id
    start_idx = int(request.vars.start_idx)
    end_idx = int(request.vars.end_idx)
    print(start_idx)
    print(end_idx)
    print('getting user images')
    imagelist = []
    has_more = False
    rows = db(db.user_images.created_by == user_id).select(orderby=~db.user_images.id,
                                                           limitby=(start_idx, end_idx + 1))
    rcheck = rows.first()
    if rcheck is not None:
        for i, r in enumerate(rows):
            if i < end_idx - start_idx:
                t = dict(
                    id = r.id,
                    created_on = r.created_on,
                    created_by = r.created_by,
                    image_url = r.image_url,
                    price = r.price,
                )
                imagelist.append(t)
            else:
                has_more = True

        print('got user images')
        # print (len(imagelist))
    else:
        print('got no user images')
    return response.json(dict(
        imagelist = imagelist,
        has_more = has_more
    ))

@auth.requires_login()
@auth.requires_signature()
def get_users():
    print('getting users')
    auth_id = auth.user.id
    userlist = []
    row = db(db.auth_user.id == auth.user.id).select()
    for r in row:
        t = dict(
            first_name = r.first_name,
            last_name = r.last_name,
            email = r.email,
            id = r.id,
        )
    userlist.append(t)
    rows = db(db.auth_user.id != auth.user.id).select()
    for r in rows:
        # print(r.first_name)
        t = dict(
            first_name = r.first_name,
            last_name = r.last_name,
            email = r.email,
            id = r.id,
        )
        userlist.append(t)
    print('got users')
    return response.json(dict(
        userlist = userlist,
        auth_id = auth_id,
    ))
    
@auth.requires_login()
@auth.requires_signature()
def set_price():
    print('editing price')
    image_id = request.vars.image_id
    new_price = float(request.vars.price)
    print('new price should be: '+ str(new_price))
    db(db.user_images.id == image_id).update(price = new_price)
    print('price modified to: ' +
          str(db(db.user_images.id == image_id).select().first().price))
    return